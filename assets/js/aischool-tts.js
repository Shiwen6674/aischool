(function() {
  const MAX_AUDIO_CACHE_ITEMS = 24;
  const CLOUD_FAILURE_COOLDOWN_MS = 30000;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent || "");
  }

  function isMobileDevice() {
    return isIOSDevice() || isAndroidDevice();
  }

  function isMostlyEnglish(text) {
    const raw = String(text || "");
    const latin = (raw.match(/[A-Za-z]/g) || []).length;
    const cjk = (raw.match(/[\u4E00-\u9FFF]/g) || []).length;

    if (cjk === 0) return latin > 0;
    return latin > cjk * 2;
  }

  function decodeHtmlEntities(text) {
    const raw = String(text || "");
    if (!/[&<>\u00A0]/.test(raw) || typeof document === "undefined") {
      return raw.replace(/\u00A0/g, " ");
    }

    const textarea = document.createElement("textarea");
    textarea.innerHTML = raw;
    return textarea.value.replace(/\u00A0/g, " ");
  }

  function normalizeSpeechText(text) {
    const decoded = decodeHtmlEntities(text)
      .replace(/<[^>]*>/g, " ")
      .replace(/[ \t\r\n]+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();

    if (!decoded) return "";

    return decoded
      .replace(/([\u4E00-\u9FFF])([A-Za-z0-9])/g, "$1 $2")
      .replace(/([A-Za-z0-9])([\u4E00-\u9FFF])/g, "$1 $2")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function splitTextForSpeak(text, isEng, maxChunkLength) {
    const sourceText = normalizeSpeechText(text);
    const regex = isEng ? /([.?!;]+\s*)/ : /([\u3002\uff01\uff1f\uff1b!?;]+\s*)/;
    const segments = sourceText
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

      const parts = trimmed.split(isEng ? /([,:]\s*)/ : /([\uff0c\u3001\uff1a,:\uff1b;]\s*)/).filter(Boolean);
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

    if (!chunks.length) return sourceText ? [sourceText] : [];

    if (!isEng) {
      const hardLimit = Math.max(18, Math.floor(limit * 1.25));
      return chunks.flatMap((chunk) => {
        if (chunk.length <= hardLimit) return [chunk];
        const next = [];
        let buffer = "";

        Array.from(chunk).forEach((char) => {
          buffer += char;
          if (buffer.length >= hardLimit) {
            next.push(buffer.trim());
            buffer = "";
          }
        });

        if (buffer.trim()) next.push(buffer.trim());
        return next;
      });
    }

    return chunks;
  }

  function getSpeechPlatform() {
    if (isIOSDevice()) return "ios";
    if (isAndroidDevice()) return "android";
    return "desktop";
  }

  function getVoiceDescriptor(voice) {
    const name = String(voice?.name || "").toLowerCase();
    const uri = String(voice?.voiceURI || "").toLowerCase();
    const lang = String(voice?.lang || "").toLowerCase().replace(/_/g, "-");

    return {
      name,
      uri,
      lang,
      descriptor: `${name} ${uri}`.trim()
    };
  }

  function getLanguageScore(lang, isEng) {
    if (isEng) {
      if (lang === "en-us") return 2400;
      if (lang === "en-gb") return 2200;
      if (lang === "en-au") return 2100;
      if (lang.startsWith("en-")) return 1800;
      if (lang === "en") return 1600;
      return -100000;
    }

    if (lang === "zh-tw") return 2800;
    if (lang === "cmn-hant-tw") return 2700;
    if (lang === "zh-hk") return 2200;
    if (lang === "zh-cn") return 2100;
    if (lang.startsWith("zh-")) return 1700;
    if (lang === "zh") return 1500;
    return -100000;
  }

  function getVoiceProfilePatterns(platform, isEng, gender) {
    const table = {
      ios: {
        en: {
          female: [/samantha/, /ava/, /victoria/, /allison/, /serena/, /karen/, /moira/, /siri/],
          male: [/daniel/, /alex/, /nathan/, /aaron/, /tom/, /fred/, /oliver/]
        },
        zh: {
          female: [/mei-jia|meijia/, /ting-ting|tingting/, /sin-ji|sinji/, /hanhan/, /yating/, /xiaoxiao/, /hsiaochen|hsiaoyu/, /siri/],
          male: [/yu-shu|yushu/, /li-mu|limu/, /yunxi/, /yunjian|yunyang/, /zhiwei/, /kangkang/]
        }
      },
      android: {
        en: {
          female: [/google.*female.*en/, /google.*en-us/, /google.*english/, /jenny/, /zira/, /samantha/, /ava/, /aria/, /emma/],
          male: [/google.*male.*en/, /google.*en-gb/, /daniel/, /alex/, /nathan/, /guy/, /david/, /ryan/]
        },
        zh: {
          female: [/google.*zh/, /google.*mandarin/, /xiaoxiao/, /hanhan/, /yating/, /hsiaoyu|hsiaochen/, /huihui/],
          male: [/yunxi/, /yunjian|yunyang/, /zhiwei/, /google.*male.*zh/, /google.*mandarin.*male/, /yu-shu|yushu/, /li-mu|limu/]
        }
      },
      desktop: {
        en: {
          female: [/zira/, /jenny/, /aria/, /emma/, /samantha/, /ava/, /victoria/, /hazel/],
          male: [/david/, /guy/, /mark/, /daniel/, /alex/, /nathan/, /aaron/, /tom/]
        },
        zh: {
          female: [/mei-jia|meijia/, /hsiaochen|hsiaoyu/, /hanhan/, /yating/, /xiaoxiao/, /huihui/, /ting-ting|tingting/, /sin-ji|sinji/],
          male: [/yu-shu|yushu/, /yunxi/, /yunjian|yunyang/, /zhiwei/, /kangkang/, /li-mu|limu/, /xiaoyi/]
        }
      }
    };

    const familyKey = isEng ? "en" : "zh";
    return table[platform]?.[familyKey]?.[gender] || [];
  }

  function scoreProfileMatch(descriptor, patterns) {
    let score = 0;
    patterns.forEach((pattern, index) => {
      if (pattern.test(descriptor)) {
        score = Math.max(score, 16000 - index * 1200);
      }
    });
    return score;
  }

  function pickBestVoice(voices, isEng, gender) {
    if (!Array.isArray(voices) || voices.length === 0) return null;

    const platform = getSpeechPlatform();
    const profilePatterns = getVoiceProfilePatterns(platform, isEng, gender);

    function getScore(voice) {
      let score = 0;
      const { name, lang, descriptor } = getVoiceDescriptor(voice);
      score += getLanguageScore(lang, isEng);
      if (score < 0) return score;

      if (voice.default) score += 300;
      if (voice.localService) score += platform === "ios" ? 3200 : 800;
      if (platform === "android" && !voice.localService) score += isEng ? 900 : 2200;

      if (/enhanced|premium|natural|neural|studio|wavenet|online|cloud|high quality|siri voice/.test(descriptor)) score += 6500;
      if (/compact|espeak|ekho|festival|robot|legacy|novelty/.test(descriptor)) score -= 14000;
      if (/siri/.test(descriptor)) score += isEng ? 1200 : 5200;
      if (/google/.test(descriptor)) score += platform === "android" ? 3200 : 1400;
      if (/microsoft/.test(descriptor) && platform === "desktop") score += 2200;
      if (/apple/.test(descriptor) && platform !== "android") score += 1800;
      if (!isEng && /zh-tw|cmn-hant-tw|taiwan|mandarin.*taiwan|國語|中文/.test(`${lang} ${descriptor}`)) score += 1800;

      score += scoreProfileMatch(descriptor, profilePatterns);

      if (gender === "female") {
        if (/female|woman|girl|zira|samantha|ava|victoria|allison|serena|karen|moira|mei-jia|meijia|ting-ting|tingting|sin-ji|sinji|hanhan|yating|xiaoxiao|hsiaochen|hsiaoyu|jenny|aria|emma/.test(descriptor)) {
          score += 2600;
        }
        if (/male|man|boy|daniel|alex|nathan|aaron|david|guy|mark|yu-shu|yushu|yunxi|yunjian|yunyang|zhiwei|kangkang|li-mu|limu/.test(descriptor)) {
          score -= 5200;
        }
      } else {
        if (/male|man|boy|daniel|alex|nathan|aaron|david|guy|mark|ryan|yu-shu|yushu|yunxi|yunjian|yunyang|zhiwei|kangkang|li-mu|limu/.test(descriptor)) {
          score += 2600;
        }
        if (/female|woman|girl|zira|samantha|ava|victoria|allison|serena|karen|moira|mei-jia|meijia|ting-ting|tingting|sin-ji|sinji|hanhan|yating|xiaoxiao|hsiaochen|hsiaoyu|jenny|aria|emma/.test(descriptor)) {
          score -= 5200;
        }
      }

      if (!isEng && /samantha|ava|zira|victoria|daniel|alex|nathan|aaron|david|guy/.test(descriptor)) {
        score -= 7000;
      }
      if (isEng && /mei-jia|meijia|ting-ting|tingting|sin-ji|sinji|yunxi|yunjian|yunyang|zhiwei|yu-shu|yushu/.test(descriptor)) {
        score -= 7000;
      }
      if (isEng && gender === "female" && /siri/.test(descriptor)) {
        score -= 3200;
      }
      if (isEng && gender === "female" && /zira/.test(descriptor) && platform !== "desktop") {
        score -= 2200;
      }

      return score;
    }

    const ranked = voices
      .map((voice) => ({ voice, score: getScore(voice) }))
      .filter((item) => item.score > -5000)
      .sort((a, b) => b.score - a.score || String(a.voice.name || "").localeCompare(String(b.voice.name || "")));

    return ranked.length ? ranked[0].voice : voices[0];
  }

  function getSpeechTuning(isEng, voice, gender, uiRate) {
    const platform = getSpeechPlatform();
    const descriptor = getVoiceDescriptor(voice).descriptor;
    const tuningProfiles = {
      ios: {
        en: {
          female: { rate: 0.95, pitch: 0.94 },
          male: { rate: 0.96, pitch: 0.9 }
        },
        zh: {
          female: { rate: 0.8, pitch: 0.98 },
          male: { rate: 0.78, pitch: 0.86 }
        }
      },
      android: {
        en: {
          female: { rate: 0.97, pitch: 0.95 },
          male: { rate: 0.98, pitch: 0.92 }
        },
        zh: {
          female: { rate: 0.84, pitch: 0.98 },
          male: { rate: 0.82, pitch: 0.86 }
        }
      },
      desktop: {
        en: {
          female: { rate: 0.98, pitch: 0.96 },
          male: { rate: 0.98, pitch: 0.93 }
        },
        zh: {
          female: { rate: 0.9, pitch: 0.99 },
          male: { rate: 0.86, pitch: 0.87 }
        }
      }
    };

    const familyKey = isEng ? "en" : "zh";
    const genderKey = gender === "male" ? "male" : "female";
    const baseProfile = tuningProfiles[platform]?.[familyKey]?.[genderKey] || { rate: 1, pitch: 1 };

    let rate = uiRate * baseProfile.rate;
    let pitch = baseProfile.pitch;

    if (!isEng) {
      if (/mei-jia|meijia|siri|hsiaochen|hsiaoyu|hanhan|yating|xiaoxiao/.test(descriptor)) {
        rate += platform === "desktop" ? 0.02 : 0.01;
        pitch += gender === "male" ? 0.02 : 0.01;
      }
      if (/yu-shu|yushu|li-mu|limu|yunxi|yunjian|yunyang|zhiwei|kangkang/.test(descriptor)) {
        rate -= 0.01;
        pitch -= 0.02;
      }
      if (/google/.test(descriptor) && platform === "android") {
        rate -= 0.01;
      }
    } else {
      if (/samantha|ava|victoria|allison|serena|karen|moira|jenny|aria|emma/.test(descriptor)) {
        rate += 0.01;
      }
      if (/daniel|alex|nathan|aaron|david|guy|mark|ryan|tom/.test(descriptor)) {
        rate -= 0.01;
        pitch -= 0.01;
      }
      if (/google/.test(descriptor) && platform === "android") {
        rate += 0.01;
      }
      if (/siri|zira/.test(descriptor) && gender !== "male") {
        rate -= 0.03;
        pitch -= 0.03;
      }
    }

    return {
      rate: clamp(rate, isEng ? 0.84 : 0.68, isEng ? 1.12 : 0.98),
      pitch: clamp(pitch, gender === "male" ? 0.8 : 0.9, gender === "male" ? 0.98 : 1.06)
    };
  }

  function buildCloudVoiceProfile(request) {
    const platform = getSpeechPlatform();
    const family = request?.isEng ? "en" : "zh";
    const gender = request?.gender === "male" ? "male" : "female";
    return {
      platform,
      family,
      gender,
      profileId: `${platform}-${family}-${gender}`,
      locale: request?.lang || (family === "en" ? "en-US" : "zh-TW"),
      style: family === "zh" ? "taiwan-mandarin-natural" : "clear-educational",
      timbre: gender === "male" ? "warm-male" : "warm-female"
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
    let cloudUnavailableUntil = 0;
    let cloudFailureCount = 0;

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

    function rememberAudioAsset(cacheKey, asset) {
      audioCache.set(cacheKey, asset);

      while (audioCache.size > MAX_AUDIO_CACHE_ITEMS) {
        const oldestKey = audioCache.keys().next().value;
        const oldestAsset = audioCache.get(oldestKey);
        audioCache.delete(oldestKey);
        if (oldestAsset?.src && objectUrls.has(oldestAsset.src)) {
          URL.revokeObjectURL(oldestAsset.src);
          objectUrls.delete(oldestAsset.src);
        }
      }
    }

    async function getCloudAudioSource(text, request) {
      const endpointInfo = getCloudEndpointInfo(request.endpointKey);
      if (!endpointInfo.url || !endpointInfo.isConfigured) return null;

      const cacheKey = JSON.stringify([endpointInfo.url, text, request.lang, request.gender, request.rate]);
      if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey);
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), isMobileDevice() ? 18000 : 15000);
      let response;
      try {
        response = await fetch(endpointInfo.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, audio/mpeg, audio/wav, audio/ogg"
          },
          body: JSON.stringify({
            action: "tts",
            text,
            lang: request.lang,
            gender: request.gender,
            rate: request.rate,
            format: "mp3",
            languageFamily: request.isEng ? "en" : "zh",
            voiceProfile: buildCloudVoiceProfile(request),
            deviceClass: getSpeechPlatform(),
            preferredEngine: "cloud-first",
            preferredQuality: "natural",
            speakingStyle: request.isEng ? "clear-educational" : "taiwan-mandarin-natural",
            textType: "plain"
          }),
          redirect: "follow",
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (contentType.startsWith("audio/") || contentType.includes("application/octet-stream")) {
        if (!response.ok) throw new Error(`TTS HTTP ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        objectUrls.add(url);
        const asset = {
          kind: "url",
          src: url,
          mimeType: contentType.startsWith("audio/") ? contentType : (blob.type || "audio/mpeg")
        };
        rememberAudioAsset(cacheKey, asset);
        return asset;
      }

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

      rememberAudioAsset(cacheKey, asset);
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
      cloudFailureCount = 0;
      cloudUnavailableUntil = 0;
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
      if (!synth) {
        notifyModeChange("idle");
        if (typeof request.onComplete === "function") request.onComplete();
        return Promise.resolve(false);
      }

      const voices = synth.getVoices();
      const selectedVoice = pickBestVoice(voices, request.isEng, request.gender);
      const mobile = isMobileDevice();
      const maxChunkLength = request.isEng ? (mobile ? 165 : 260) : (mobile ? 34 : 64);
      const chunks = splitTextForSpeak(text, request.isEng, maxChunkLength);
      const chunkGapMs = request.isEng ? (mobile ? 55 : 20) : (mobile ? 95 : 45);

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

          utterance.onend = () => window.setTimeout(speakNextChunk, chunkGapMs);
          utterance.onerror = () => window.setTimeout(speakNextChunk, chunkGapMs);
          synth.speak(utterance);
        }

        synth.cancel();
        window.setTimeout(speakNextChunk, mobile ? 80 : 10);
      });
    }

    async function speak(text, optionsOverride) {
      const request = {
        endpointKey: config.endpointKey || "cloudTts",
        preferCloud: config.preferCloud !== false,
        gender: typeof config.getGender === "function" ? config.getGender() : "female",
        rate: typeof config.getRate === "function" ? config.getRate() : 1,
        ...optionsOverride
      };

      const cleanText = normalizeSpeechText(text);
      if (!cleanText) {
        if (typeof request.onComplete === "function") request.onComplete();
        return false;
      }

      runId += 1;
      const expectedRunId = runId;
      stopAudioElement();
      if (synth) synth.cancel();

      request.isEng = typeof request.isEng === "boolean" ? request.isEng : isMostlyEnglish(cleanText);
      request.lang =
        request.lang ||
        (typeof config.languageResolver === "function" ? config.languageResolver(cleanText, request) : "") ||
        (request.isEng ? "en-US" : "zh-TW");

      if (request.preferCloud && isCloudConfigured(request.endpointKey) && Date.now() >= cloudUnavailableUntil) {
        try {
          return await playCloud(cleanText, request, expectedRunId);
        } catch {
          cloudFailureCount += 1;
          cloudUnavailableUntil = Date.now() + Math.min(CLOUD_FAILURE_COOLDOWN_MS * cloudFailureCount, 120000);
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
      buildCloudVoiceProfile,
      getSpeechPlatform,
      getSpeechTuning,
      isAndroidDevice,
      isIOSDevice,
      isMobileDevice,
      isMostlyEnglish,
      normalizeSpeechText,
      pickBestVoice,
      splitTextForSpeak
    }
  };
})();
