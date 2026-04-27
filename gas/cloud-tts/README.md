# AI School Cloud TTS

Google Apps Script proxy for the bilingual reading TTS player.

## Deploy

From the repository root:

```powershell
clasp push -f -P gas\cloud-tts\.clasp.json
clasp deploy -d "AI School Cloud TTS" -P gas\cloud-tts\.clasp.json
```

The browser must never receive the OpenAI API key. Set it as a Script
property named `OPENAI_API_KEY` in the Apps Script project, or run the
server-side helper after the project is authorized:

```powershell
clasp run setOpenAiApiKey -P gas\cloud-tts\.clasp.json --params '["sk-..."]'
```

Only put the deployed Web App `/exec` URL into `assets/js/aischool-shared.js`
after the health endpoint returns JSON with `"configured": true`.

## Current deployment

- Script ID: `1ExDWYqvZ1wi41qjCQEoHUQsZHZyS3sTWR9f0IOKm0QwCHLlPrtpkWhjQ`
- Latest attempted deployment: `AKfycbwFHFv-73Ik2oAh1V2T-xrHaJwNyA6YAdd7P-6_wo_z33nGUAY8JoM3CUMzMNPCCxPNOQ`

If the `/exec` URL returns HTTP 403, the Web App access setting still needs to
be changed in the Apps Script deployment UI to allow anonymous access.
