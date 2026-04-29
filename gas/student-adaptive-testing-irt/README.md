# AI School Student Adaptive Testing IRT Backend

This Apps Script is the IRT-aware backend for `science_adaptive_testing.html`.
It keeps the public GitHub Pages frontend static while the Apps Script web app
reads/writes the Google Sheet.

## What It Does

- Uses the `CATItemBank` sheet as the item bank.
- Reads the 3PL parameters `IRT_a`, `IRT_b`, and `IRT_c`.
- Starts each CAT session near `theta = 0`.
- After every response, updates the student ability estimate `theta`.
- After every response, slightly recalibrates `IRT_a`, `IRT_b`, and `IRT_c`
  and writes them back to `CATItemBank`.
- Chooses the next item by difficulty direction:
  - correct response: next item targets a higher `IRT_b`
  - incorrect response: next item targets a lower `IRT_b`
- Logs every response into `CATresponse`.

## Deploy

1. Create or open the Apps Script project that currently powers
   `studentAdaptiveTesting`.
2. Copy `Code.js` into the project. If an existing backend already has
   `startCAT`, `submitAndNext`, or `finishCAT`, merge these handlers instead
   of replacing unrelated code.
3. Set the Web App deployment:
   - Execute as: Me
   - Who has access: Anyone
4. Keep the deployed Web App URL in
   `window.AISchoolConfig.gas.studentAdaptiveTesting`.

The frontend now sends `adaptive_strategy=irt_3pl`, the current `theta`, the
administered item ids, and `irt_policy.update_item_parameters=true`, so this
backend can perform the write-back automatically.

## Codex Project

This folder is already linked to Apps Script project:

`1KF4V5nF8NLrsY5vJBol4Rbw8xad9mOmzPskvmTr1x85-tk0lA8koCy9B`

Codex pushed the source successfully. If a URL made from a `clasp deploy`
deployment id returns HTTP 404, open the project in Apps Script and create a
new deployment with type **Web app**. Some Apps Script accounts create a
versioned deployment through `clasp` without attaching the Web App entry point.
