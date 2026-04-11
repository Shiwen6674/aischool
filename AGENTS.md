# AI School Agent Guide

本專案沒有模組化前端或 build pipeline。Codex 進入專案後，應先靠文件與頁面分群建立心智模型，再只讀必要頁面。

## Read First

每次開始工作時，請依序讀：

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/workflows.md`
4. `docs/examples/` 中最接近任務的範例
5. 再讀會修改到的 `.html` 頁面

## Project Reality

- 這是一個由多個獨立 `.html` 頁面組成的靜態網站群。
- 大部分頁面把 HTML、CSS、JavaScript 都寫在同一檔。
- 共用依賴主要透過 CDN 載入，例如 Tailwind、Font Awesome、Chart.js、Cytoscape。
- `assets/js/aischool-shared.js` 已成為全站主要的共用 runtime，集中管理 session、flash message、語言 key 與 GAS endpoint。
- `assets/css/student-hub.css` 與 `assets/js/student-hub.js` 是學生學習中心的共用骨架，優先用來承接原本的 placeholder 頁。
- 學生端原本的空白 placeholder 頁已升級成可用的學習中心頁，但多數仍屬內容導向頁，而不是完整 API 工具。
- 登入狀態仍以 `currentUser` 為主，但 professor 頁家族還沒有完全與 shared runtime 對齊。

## Non-Negotiables

- 先確認頁面是正式工具頁、學習中心頁，還是尚未接後端的內容頁，再做變更。
- 變更頁面導向時，要同時檢查：
  - 入口頁 `index.html`
  - hub 頁 `student_subject.html`、`teacher.html`、`professor.html`
  - 相關子功能頁
- 若調整登入或 session 流，至少同步檢查：
  - `assets/js/aischool-shared.js`
  - `index.html`
  - `teacher.html`
  - `student_subject.html`
  - `student_science.html`
  - `professor.html`
  - 受保護的 professor 子頁
- 若調整 GAS endpoint，不要只改單一頁面；優先改 `assets/js/aischool-shared.js`，再確認引用頁是否都跟上。
- 若調整學生學習中心頁，優先沿用 `assets/css/student-hub.css` 與 `assets/js/student-hub.js`，除非該頁真的需要獨立互動架構。
- `student_subject.html` 現在多了一個 `student_keyidea.html` 的跨科入口，動學生主導航時要一起檢查。

## Page Families

- `index.html`
  - 入口、登入、註冊、角色分流
- Student
  - `student_subject.html`
  - `student_keyidea.html`
  - `student_chinese.html`
  - `student_english.html`
  - `student_math.html`
  - `student_society.html`
  - `student_science.html`
  - `student_science_bilingual.html`
  - `science_unit_coreidea.html`
  - `science_adaptive_testing.html`
  - `science_virtural_lab.html`
  - `science_cap.html`（國中教育會考自然科模擬）
  - `science_csat.html`（高中學測自然科戰略，保留舊檔名）
- Teacher
  - `teacher.html`
  - `teacher_itemvocabularyexamination.html`
  - `teacher_CAT_review.html`
- Professor
  - `professor.html`
  - `professor_SFL_analysis.html`
  - `professor_conceptnetwork.html`
  - `professor_science_text_query.html`
  - `professor_text_readability.html`
  - `professor_text_similarity.html`
  - `professor_textvocabularycomparison.html`
  - `professor_wordcloud.html`
  - `processor_text_segmentation.html`

## Default Task Routing

- 入口、登入、角色流：先讀 `index.html`
- session、flash、語言 key：先讀 `assets/js/aischool-shared.js`
- 學生路徑：先讀 `student_subject.html`，再讀對應學科頁
- 教師工具：先讀 `teacher.html`，再讀目標工具頁
- 教授工具：先讀 `professor.html`，再讀對應外部功能頁
- GAS 或資料記錄問題：先全文盤點所有硬編碼 `script.google.com/macros/s/.../exec`
- 多語系問題：先確認該頁用的是哪個 key
  - `AI_SCHOOL_LANG`
  - `slh_lang`
  - `appLang`

## Verification Standard

本專案目前沒有自動化測試，預設至少做以下檢查：

1. 主導航是否仍能走通：
   - `index.html`
   - `student_subject.html`
   - `teacher.html`
   - `professor.html`
2. 受保護頁是否仍能從 session 恢復使用者資訊。
3. 目標頁若依賴 GAS，失敗時是否有合理提示。
4. 若改到學生學習中心頁，確認主導航、共用骨架與文件都同步更新。

## Known Drift To Watch

- `professor` 與 `researcher` 命名在不同 DOM 與文案層混用。
- `currentUser`、`isLoggedIn`、`redirectMsg` 都存在，但不是每頁都用同一套。
- 不同頁面的語言設定 key 不一致。
- `teacher_CAT_review.html` 的 GAS endpoint 仍需要真實部署 ID，shared config 只是把它集中起來，沒有替它憑空補出可用後端。
- 多個頁面直接各自維護視覺與 API 邏輯，重複碼很多，改動容易只修一半。
