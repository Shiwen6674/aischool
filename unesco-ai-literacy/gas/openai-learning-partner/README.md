# GAS OpenAI Learning Partner

This Google Apps Script web app keeps the OpenAI API key and optional Google Sheets write access on the server side. Do not put the API key in `index.html`, `app.js`, or any public GitHub file.

## Setup

1. Create a Google Apps Script project.
2. Add `Code.gs` and `appsscript.json`.
3. In Apps Script, open **Project Settings > Script Properties** and add:
   - `OPENAI_API_KEY`: your OpenAI API key
   - `OPENAI_MODEL`: optional, default is `gpt-5.4-mini`
   - `SPREADSHEET_ID`: optional Google Sheet ID for consent, login, chat, and assessment logs
4. Deploy as **Web app**:
   - Execute as: Me
   - Who has access: Anyone
5. Copy the Web app URL.
6. Put the URL in `unesco-ai-literacy/data/site-config.json`:

```json
{
  "gasEndpoint": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
}
```

The frontend sends `text/plain` JSON requests to avoid exposing the API key and to keep the request CORS-simple. When `SPREADSHEET_ID` is blank, the website still works and keeps records in the browser.
