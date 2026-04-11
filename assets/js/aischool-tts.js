(function() {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent || "");
  }

  function isMostlyEnglish(text) {
    const raw = String(text || "");
    const latin = (raw.match(/[A-Za-z]/g) || []).length;
    const cjk = (raw.match(/[\u4E00-\u9FFF]/g) || []).length;

    if (cjk === 0) return latin > 0;
    return latin > cjk * 2;
  }

  function splitTextForSpeak(text, isEng, maxChunkLength) {
    const regex = isEng ? /([.?!;]+)/ : /([。！？；]+)/;
    const segments = String(text || "")
      .split(regex)
      .reduce((acc, curr, index) => {
        if (index % 2 === 0) {
          acc.push(curr);
        } else {
          acc[acc.length - 1] += curr;
        }
        return acc;
      }, [])
      .filter((segment) => segment && segment.trim().length > 0);

    const limit = maxChunkLength || (isEng ? 220 : 60);
    const chunks = [];

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      if (trimmed.length <= limit) {
        chunks.push(trimmed);
        continue;
      }

      const parts = trimmed.split(isEng ? /([,:])/ : /([，、：])/).filter(Boolean);
      let buffer = "";
      for (const part of parts) {
        const candidate = `${buffer}${part}`.trim();
        if (candidate.length > limit && buffer) {
          chunks.push(buffer.trim());
          buffer = part;
        } else {
          buffer += part;
        }
      }

      if (buffer.trim()) {
        chunks.push(buffer.trim());
      }
    }

    return chunks.length ? chunks : [String(text || "")];
  }

  function pickBestVoice(voices, isEng, gender) {
    if (!Array.isArray(voices) || voices.length === 0) return null;

    const ios = isIOSDevice();
    const android = isAndroidDevice();
    const targetLang = isEng ? ["en-us", "en-gb", "en", "en-au"] : ["zh-tw", "zh-hk", "zh-cn", "zh"];

    function getScore(voice) {
      let score = 0;
      const name = String(voice.name || "").toLowerCase();
      const uri = String(voice.voiceURI || "").toLowerCase();
      const lang = String(voice.lang || "").toLowerCase().replace(/_/g, "-");
      const descriptor = `${name} ${uri}`.trim();

      if (targetLang.some((target) => lang === target || lang.startsWith(target))) {
        score += 1000;
        if (!isEng && (lang === "zh-tw" || lang.includes("taiwan"))) score += 500;
        if (isEng && lang === "en-us") score += 200;
      } else {
        return -100000;
      }

      if (voice.default) score += 400;
      if (voice.localService) score += ios ? 2500 : 400;

      if (/enhanced|premium|natural|neural|studio|wavenet|online|cloud/.test(descriptor)) score += 6000;
      if (/compact|espeak|ekho|festival/.test(descriptor)) score -= 12000;
      if (/siri/.test(descriptor)) score += isEng ? 2500 : 4500;

      if (gender === "female") {
        if (isEng) {
          if (name.includes("samantha")) score += 12000;
          else if (name.includes("ava")) score += 10000;
          else if (name.includes("zira") || name.includes("susan")) score += 5000;
          if (name.includes("male") || name.includes("man")) score -= 4000;
        } else {
          if (/mei-jia|meijia/.test(descriptor)) score += 15000;
          else if (/ting-ting|tingting/.test(descriptor)) score += 14000;
          else if (/sin-ji|sinji/.test(descriptor)) score += 13000;
          else if (/hsiaoyu|xiaoxiao/.test(descriptor)) score += 12000;
          else if (/hanhan|yating/.test(descriptor)) score += 9000;
          else if (/google/.test(descriptor) && (lang === "zh-tw" || lang === "zh-cn")) score += 7000;
          if (ios && /mei-jia|meijia|ting-ting|tingting|sin-ji|sinji/.test(descriptor)) score += 5000;
          if (android && /google|xiaoxiao|hsiaoyu|hanhan|yating/.test(descriptor)) score += 4000;
          if (name.includes("male") || name.includes("man")) score -= 4500;
        }
      } else if (isEng) {
        if (name.includes("daniel")) score += 12000;
        else if (name.includes("alex")) score += 10000;
        else if (name.includes("nathan")) score += 9000;
        if (name.includes("female") || name.includes("woman")) score -= 4000;
      } else {
        if (/yunxi/.test(descriptor)) score += 12000;
        else if (/li-mu/.test(descriptor)) score += 10000;
        else if (/zhiwei/.test(descriptor)) score += 9000;
        else if (/google/.test(descriptor) && (lang === "zh-tw" || lang === "zh-cn")) score += 5000;
        if (android && /google|yunxi|zhiwei/.test(descriptor)) score += 2500;
        if (name.includes("female") || name.includes("woman") || /mei-jia|meijia/.test(descriptor)) score -= 4500;
      }

      if (!isEng) {
        if (/google/.test(descriptor) && ios) score -= 2500;
        if (/samantha|ava|zira|susan/.test(descriptor)) score -= 5000;
      }

      return score;
    }

    const ranked = voices
      .map((voice) => ({ voice, score: getScore(voice) }))
      .filter((item) => item.score > -5000)
      .sort((a, b) => b.score - a.score);

    return ranked.length ? ranked[0].voice : voices[0];
  }

  function getSpeechTuning(isEng, voice, gender, uiRate) {
    const ios = isIOSDevice();
    const android = isAndroidDevice();
    const descriptor = `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();

    if (isEng) {
      return {
        rate: clamp(ios ? uiRate * 0.96 : uiRate, 0.85, 1.15),
        pitch: gender === "male" ? 0.94 : 1.02
      };
    }

    let rate = uiRate;
    let pitch = gender === "male" ? 0.9 : 0.98;

    if (ios) {
      rate = uiRate * 0.82;
      pitch = gender === "male" ? 0.88 : 0.96;
      if (/mei-jia|meijia|ting-ting|tingting|sin-ji|sinji|siri/.test(descriptor)) {
        rate = uiRate * 0.86;
        pitch = gender === "male" ? 0.9 : 0.98;
      }
    } else if (android) {
      rate = uiRate * 0.88;
      pitch = gender === "male" ? 0.9 : 0.98;
      if (/google|xiaoxiao|hsiaoyu|hanhan|yating/.test(descriptor)) {
        rate = uiRate * 0.92;
        pitch = gender === "male" ? 0.92 : 1.0;
      }
    } else {
      rate = uiRate * 0.94;
      pitch = gender === "male" ? 0.92 : 1.0;
    }

    return {
      rate: clamp(rate, 0.72, 1.02),
      pitch: clamp(pitch, 0.82, 1.02)
    };
  }

  function decodeBase64ToBytes(base64) {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function parseCloudAudioResponse(payload) {
    const source = payload && typeof payload === "object" ? (payload.data || payload.result || payload) : null;
    if (!source || typeof source !== "object") return null;

    const audioUrl = source.audioUrl || source.audio_url || source.url || source.signedUrl;
    if (audioUrl) {
      return {
        kind: "url",
        src: String(audioUrl),
        mimeType: String(source.mimeType || source.mime_type || "audio/mpeg")
      };
    }

    const base64 = source.audioContent || source.audio_content || source.audioBase64 || source.audio_base64 || source.base64;
    if (!base64) return null;

    return {
      kind: "base64",
      base64: String(base64),
      mimeType: String(source.mimeType || source.mime_type || "audio/mpeg")
    };
  }

  function createPlayer(options) {
    const config = options || {};
    const synth = window.speechSynthesis || null;
    const audio = new Audio();
    audio.preload = "auto";

    const objectUrls = new Set();
    const audioCache = new Map();
    let activeMode = "idle";
    let paused = false;
    let runId = 0;

    function notifyModeChange(mode) {
      if (activeMode === mode) return;
      activeMode = mode;
      if (typeof config.onModeChange === "function") {
        config.onModeChange(mode);
      }
    }

    function getCloudEndpointInfo(endpointKey) {
      const key = endpointKey || config.endpointKey || "cloudTts";
      if (!window.AISchool?.getGasUrlInfo) {
        return { key, url: "", isConfigured: false, source: "missing" };
      }
      return window.AISchool.getGasUrlInfo(key);
    }

    function isCloudConfigured(endpointKey) {
      const info = getCloudEndpointInfo(endpointKey);
      return Boolean(info && info.url && info.isConfigured);
    }

    async function getCloudAudioSource(text, request) {
      const endpointInfo = getCloudEndpointInfo(request.endpointKey);
      if (!endpointInfo.url || !endpointInfo.isConfigured) return null;

      const cacheKey = JSON.stringify([endpointInfo.url, text, request.lang, request.gender, request.rate]);
      if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey);
      }

      const response = await fetch(endpointInfo.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          action: "tts",
          text,
          lang: request.lang,
          gender: request.gender,
          rate: request.rate,
          format: "mp3"
        }),
        redirect: "follow"
      });

      const json = await response.json();
      if (!response.ok || json?.ok === false) {
        throw new Error(json?.error || `TTS HTTP ${response.status}`);
      }

      const parsed = parseCloudAudioResponse(json);
      if (!parsed) {
        throw new Error("Cloud TTS response missing audio payload.");
      }

      let asset = parsed;
      if (parsed.kind === "base64") {
        const bytes = decodeBase64ToBytes(parsed.base64);
        const blob = new Blob([bytes], { type: parsed.mimeType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        objectUrls.add(url);
        asset = {
          kind: "url",
          src: url,
          mimeType: parsed.mimeType || "audio/mpeg"
        };
      }

      audioCache.set(cacheKey, asset);
      return asset;
    }

    function stopAudioElement() {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {}
    }

    function cancel() {
      runId += 1;
      paused = false;
      stopAudioElement();
      if (synth) synth.cancel();
      notifyModeChange("idle");
    }

    function pause() {
      if (activeMode === "cloud" && !audio.paused) {
        audio.pause();
        paused = true;
        return true;
      }

      if (activeMode === "browser" && synth && synth.speaking && !synth.paused) {
        synth.pause();
        paused = true;
        return true;
      }

      return false;
    }

    function resume() {
      if (activeMode === "cloud" && audio.paused) {
        paused = false;
        audio.play().catch(() => {});
        return true;
      }

      if (activeMode === "browser" && synth && synth.paused) {
        paused = false;
        synth.resume();
        return true;
      }

      return false;
    }

    function isPaused() {
      if (activeMode === "cloud") return paused || audio.paused;
      if (activeMode === "browser" && synth) return synth.paused;
      return false;
    }

    async function playCloud(text, request, expectedRunId) {
      const asset = await getCloudAudioSource(text, request);
      if (!asset || expectedRunId !== runId) return false;

      stopAudioElement();
      notifyModeChange("cloud");
      paused = false;
      audio.src = asset.src;

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          if (expectedRunId !== runId) {
            resolve(true);
            return;
          }
          notifyModeChange("idle");
          if (typeof request.onComplete === "function") request.onComplete();
          resolve(true);
        };

        audio.onerror = () => {
          notifyModeChange("idle");
          reject(new Error("Cloud audio playback failed."));
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((error) => {
            notifyModeChange("idle");
            reject(error);
          });
        }
      });
    }

    function playBrowser(text, request, expectedRunId) {
      if (!synth) return Promise.resolve(false);

      const voices = synth.getVoices();
      const selectedVoice = pickBestVoice(voices, request.isEng, request.gender);
      const mobile = isIOSDevice() || isAndroidDevice();
      const maxChunkLength = request.isEng ? (mobile ? 180 : 260) : (mobile ? 42 : 70);
      const chunks = text.length > maxChunkLength ? splitTextForSpeak(text, request.isEng, maxChunkLength) : [text];

      notifyModeChange("browser");
      paused = false;

      return new Promise((resolve) => {
        let chunkIndex = 0;

        function speakNextChunk() {
          if (expectedRunId !== runId) {
            resolve(true);
            return;
          }

          if (chunkIndex >= chunks.length) {
            notifyModeChange("idle");
            if (typeof request.onComplete === "function") request.onComplete();
            resolve(true);
            return;
          }

          const chunk = chunks[chunkIndex++];
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = selectedVoice?.lang || request.lang;
          if (selectedVoice) utterance.voice = selectedVoice;

          const tuning = getSpeechTuning(request.isEng, selectedVoice, request.gender, request.rate);
          utterance.rate = tuning.rate;
          utterance.pitch = tuning.pitch;

          utterance.onend = speakNextChunk;
          utterance.onerror = speakNextChunk;
          synth.speak(utterance);
        }

        synth.cancel();
        speakNextChunk();
      });
    }

    async function speak(text, optionsOverride) {
      const request = {
        endpointKey: config.endpointKey || "cloudTts",
        preferCloudForChinese: config.preferCloudForChinese !== false,
        gender: typeof config.getGender === "function" ? config.getGender() : "female",
        rate: typeof config.getRate === "function" ? config.getRate() : 1,
        ...optionsOverride
      };

      const cleanText = String(text || "").replace(/<[^>]*>/g, "").replace(/\u00A0/g, " ").trim();
      if (!cleanText) {
        if (typeof request.onComplete === "function") request.onComplete();
        return false;
      }

      runId += 1;
      const expectedRunId = runId;
      stopAudioElement();
      if (synth) synth.cancel();

      request.isEng = typeof request.isEng === "boolean" ? request.isEng : isMostlyEnglish(cleanText);
      request.lang = request.lang || (request.isEng ? "en-US" : "zh-TW");

      if (!request.isEng && request.preferCloudForChinese && isCloudConfigured(request.endpointKey)) {
        try {
          return await playCloud(cleanText, request, expectedRunId);
        } catch {
          if (typeof config.onCloudFallback === "function") {
            config.onCloudFallback();
          }
        }
      }

      return playBrowser(cleanText, request, expectedRunId);
    }

    window.addEventListener("beforeunload", () => {
      cancel();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    });

    return {
      cancel,
      getCloudEndpointInfo,
      getMode: () => activeMode,
      isCloudConfigured,
      isPaused,
      pause,
      resume,
      speak
    };
  }

  window.AISchoolTTS = {
    clamp,
    createPlayer,
    helpers: {
      getSpeechTuning,
      isAndroidDevice,
      isIOSDevice,
      isMostlyEnglish,
      pickBestVoice,
      splitTextForSpeak
    }
  };
})();
