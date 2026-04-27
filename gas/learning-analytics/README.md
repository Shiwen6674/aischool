# AI School Learning Analytics Apps Script

This Apps Script receives learning events from GitHub Pages and returns admin-only
learning summaries through JSONP.

## Setup

1. Create a new Apps Script project.
2. Copy `Code.js` and `appsscript.json` into the project.
3. In Script Properties, optionally set `ADMIN_SHARED_SECRET`.
4. Deploy as a Web App:
   - Execute as: Me
   - Who has access: Anyone
5. Open:
   `WEB_APP_URL?action=setup&adminToken=YOUR_SECRET`
6. Put the Web App URL into `window.AISchoolConfig.gas.learningAnalytics`
   or in the browser override key `AISCHOOL_GAS_URL_LEARNINGANALYTICS`.

The backend still checks the `student`, `teacher`, and `professor` sheets for an
admin flag before returning summaries.
