/**
 * AI School Cloud TTS proxy example for Google Apps Script.
 *
 * Deployment:
 * 1. Set Script property OPENAI_API_KEY to your server-side API key.
 * 2. Deploy as a Web App.
 * 3. Put the deployment URL into assets/js/aischool-shared.js as cloudTts,
 *    or set an AISCHOOL_GAS_OVERRIDES localStorage override during testing.
 *
 * The browser never receives the provider key. The response follows the
 * AISchoolTTS contract: { ok, audioContent, mimeType }.
 *
 * OpenAI TTS notes:
 * - gpt-4o-mini-tts accepts natural-language instructions for speaking style.
 * - AAC is a good mobile delivery format; MP3 remains the desktop default.
 */
function doGet() {
  return jsonResponse(buildHealthPayload());
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.action !== "tts") {
      return jsonResponse({ ok: false, error: "Unsupported action." });
    }

    var text = String(body.text || "").trim();
    if (!text) {
      return jsonResponse({ ok: false, error: "Missing text." });
    }

    var apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ ok: false, error: "Server is missing OPENAI_API_KEY." });
    }

    var languageFamily = body.languageFamily === "en" ? "en" : "zh";
    var gender = body.gender === "male" ? "male" : "female";
    var format = normalizeAudioFormat(body.format, body.deviceClass);
    var speed = clampNumber(Number(body.speed || body.rate || 1), languageFamily === "zh" ? 0.72 : 0.78, languageFamily === "zh" ? 1.05 : 1.12);
    var voice = pickOpenAiVoice(languageFamily, gender, body.voiceProfile);
    var instructions = buildVoiceInstructions(languageFamily, gender, speed);

    var openAiResponse = UrlFetchApp.fetch("https://api.openai.com/v1/audio/speech", {
      method: "post",
      muteHttpExceptions: true,
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + apiKey
      },
      payload: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: voice,
        input: text.slice(0, 4000),
        instructions: instructions,
        response_format: format,
        speed: speed
      })
    });

    var status = openAiResponse.getResponseCode();
    if (status < 200 || status >= 300) {
      return jsonResponse({
        ok: false,
        error: "OpenAI TTS failed.",
        status: status,
        detail: openAiResponse.getContentText().slice(0, 500)
      });
    }

    return jsonResponse({
      ok: true,
      audioContent: Utilities.base64Encode(openAiResponse.getBlob().getBytes()),
      mimeType: mimeTypeForFormat(format),
      voice: voice,
      speed: speed
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message || error) });
  }
}

function healthCheck() {
  return buildHealthPayload();
}

function setOpenAiApiKey(apiKey) {
  var value = String(apiKey || "").trim();
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(value)) {
    throw new Error("Invalid OpenAI API key format.");
  }

  PropertiesService.getScriptProperties().setProperty("OPENAI_API_KEY", value);
  return { ok: true, configured: true };
}

function buildHealthPayload() {
  return {
    ok: true,
    service: "AI School Cloud TTS",
    configured: Boolean(PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY")),
    timestamp: new Date().toISOString()
  };
}

function pickOpenAiVoice(languageFamily, gender, voiceProfile) {
  var hintedVoice = voiceProfile && voiceProfile.openAiVoice ? String(voiceProfile.openAiVoice) : "";
  if (hintedVoice) return hintedVoice;

  if (languageFamily === "zh") return gender === "male" ? "cedar" : "marin";
  return gender === "male" ? "onyx" : "coral";
}

function buildVoiceInstructions(languageFamily, gender, speed) {
  if (languageFamily === "zh") {
    return [
      "Speak in natural Taiwan Mandarin for elementary science bilingual reading.",
      "Use a warm, clear, teacher-like tone with natural phrasing.",
      "Do not read one Chinese character at a time; group words into meaningful short phrases.",
      "Read numeric lesson labels such as 1-1 as 1之1, not 1橫線1.",
      "Use light pauses after commas and longer pauses after sentence endings.",
      "Keep science terms accurate and easy for children to understand.",
      "Avoid robotic cadence, metallic timbre, or over-dramatic broadcasting.",
      "Target speaking speed is " + speed + "x, calm enough for listening practice.",
      gender === "male" ? "Use a warm adult male timbre, not a pitch-shifted female voice." : "Use a warm adult female timbre, gentle and not shrill."
    ].join(" ");
  }

  return [
    "Speak clear educational English for bilingual science reading.",
    "Use natural phrasing, calm pacing, and friendly emphasis.",
    "Avoid robotic cadence and overly flat intonation.",
    "Target speaking speed is " + speed + "x.",
    gender === "male" ? "Use a warm adult male timbre." : "Use a warm adult female timbre."
  ].join(" ");
}

function normalizeAudioFormat(format, deviceClass) {
  var raw = String(format || "").toLowerCase();
  if (raw === "aac" || raw === "mp3" || raw === "wav" || raw === "opus") return raw;
  return /ios|android/.test(String(deviceClass || "").toLowerCase()) ? "aac" : "mp3";
}

function mimeTypeForFormat(format) {
  if (format === "aac") return "audio/aac";
  if (format === "wav") return "audio/wav";
  if (format === "opus") return "audio/ogg";
  return "audio/mpeg";
}

function clampNumber(value, min, max) {
  if (!isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
