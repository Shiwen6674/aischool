# UNESCO AI Literacy Self-Learning Assessment

Static GitHub Pages prototype for an informed-consent, login, framework selection, RAG-style chat, self-assessment, and diagnostic feedback flow based on UNESCO AICFT and AICFS.

## Pages

- `index.html` - application entry point.
- `sources/` - official PDF sources used for local RAG indexing.
- `data/` - framework metadata, item bank, and tracking schema.
- `docs/` - bilingual operation manual and spreadsheet schema workbook.

## Local Preview

```powershell
cd "G:\我的雲端硬碟\05AI資料\codex\aischool"
python -m http.server 4173
```

Open:

```text
http://localhost:4173/unesco-ai-literacy/
```

## GitHub Pages URL

After pushing to `Shiwen6674/aischool`, the page is expected at:

```text
https://shiwen6674.github.io/aischool/unesco-ai-literacy/
```

## Data Notice

This is a classroom-ready static prototype. Login, chat, and assessment logs are stored in browser `localStorage` and can be exported as CSV. For real class-wide collection, connect the schema in `docs/AI_literacy_tracking_schema.xlsx` to Google Sheets Apps Script, Firebase, or another backend.
