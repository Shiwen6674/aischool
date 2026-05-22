# UNESCO AI Literacy Self-Assessment

Public student-facing website for UNESCO AICFT/AICFS AI literacy learning.

Student flow:

1. Informed consent
2. Simple student login
3. AI learning partner chat
4. Assessment menu with AICFT/AICFS and 10-30 questions
5. One-question-at-a-time answering flow
6. Diagnostic feedback and PDF report

## URL

```text
https://shiwen6674.github.io/aischool/unesco-ai-literacy/
```

## OpenAI via Google Apps Script

The frontend never stores the OpenAI API key or spreadsheet credentials. Use `gas/openai-learning-partner/Code.gs` as a Google Apps Script web app.

After deploying the Apps Script web app, set the endpoint in:

```text
data/site-config.json
```

```json
{
  "gasEndpoint": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
}
```

Apps Script properties:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, default `gpt-5.4-mini`
- `SPREADSHEET_ID` optional, writes consent, login, chat, and assessment records to Google Sheets

If `gasEndpoint` is empty or unavailable, the site continues with the built-in local question generator so class activity is not interrupted.

## Local Preview

```powershell
cd "G:\我的雲端硬碟\05AI資料\codex\aischool"
python -m http.server 4180
# Open http://localhost:4180/unesco-ai-literacy/
```

## Record Design

The browser keeps learning records in `localStorage`. For class collection, configure `SPREADSHEET_ID` in Apps Script. The provided workbook `docs/AI_literacy_tracking_schema.xlsx` documents the consent, login, chat, and assessment sheets.

## Sources

- UNESCO AICFT official page: https://www.unesco.org/en/articles/ai-competency-framework-teachers
- UNESCO AICFS official page: https://www.unesco.org/en/articles/ai-competency-framework-students
- Local PDFs are kept in `sources/` for classroom reference and prompt context.
