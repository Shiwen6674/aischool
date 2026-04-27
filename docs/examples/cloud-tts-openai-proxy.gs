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
 */
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
    var voice = pickOpenAiVoice(languageFamily, gender);
    var instructions = buildVoiceInstructions(languageFamily, gender);

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
        response_format: "mp3"
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
      mimeType: "audio/mpeg",
      voice: voice
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message || error) });
  }
}

function pickOpenAiVoice(languageFamily, gender) {
  if (languageFamily === "zh") return gender === "male" ? "cedar" : "marin";
  return gender === "male" ? "onyx" : "coral";
}

function buildVoiceInstructions(languageFamily, gender) {
  if (languageFamily === "zh") {
    return [
      "Speak natural Taiwan Mandarin for elementary science reading.",
      "Use a warm, clear, teacher-like tone.",
      "Keep pacing calm and avoid robotic syllable-by-syllable delivery.",
      gender === "male" ? "Use a warm adult male timbre." : "Use a warm adult female timbre."
    ].join(" ");
  }

  return [
    "Speak clear educational English for bilingual science reading.",
    "Use natural phrasing, calm pacing, and friendly emphasis.",
    gender === "male" ? "Use a warm adult male timbre." : "Use a warm adult female timbre."
  ].join(" ");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
