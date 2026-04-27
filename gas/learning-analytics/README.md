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

The backend checks `Users_student`, `Users_teacher`, and `Users_professor`
first, then falls back to legacy `student`, `teacher`, and `professor` sheets.
Set either the `admin` column or the `role` column to `admin`/`TRUE` for the
administrator account before returning summaries.

## Auth Hub deployment note

AI School currently points `learningAnalytics` to the same Web App URL as
`authHub` so login and analytics use one backend:

`https://script.google.com/macros/s/AKfycbzcDKkz8Tilzb3qbx0_fDR7QoG4-c2JCtsa4p9V8_1gBjZaEMlvQHd72OD0kZq_jW8H/exec`

Codex has written the analytics router into the Auth Hub Apps Script project and
created Apps Script version `27` (`Fix admin login and add learning analytics
dashboard API`). If the live dashboard still reports that Apps Script cannot be
loaded, open the Auth Hub script as the same-domain owner account, then update
the existing Web App deployment to version `27`.

Google Workspace may block deployment updates from accounts outside the script
owner's domain with:

`Only users in the same domain as the script owner may deploy this script.`

That policy must be resolved in Google before the GitHub Pages dashboard can
receive live Sheet data.
