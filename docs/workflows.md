# Workflows

這份文件定義 Codex 在 `aischool` 應採用的等價流程。核心原則是先盤點頁面群與狀態流，再精準修改單頁，不做盲改。

## 0. Context Bootstrap

適用情境：剛進 repo、接到新任務、還不清楚頁面群與資料流。

步驟：

1. 讀 `AGENTS.md`
2. 讀 `docs/architecture.md`
3. 讀 `docs/workflows.md`
4. 從 `docs/examples/` 選最接近任務的範例
5. 盤點目標功能屬於哪個頁面家族
6. 再讀會改到的 `.html`

完成標準：

- 能說出任務落在哪一個頁面家族
- 能列出受影響的頁面
- 知道是否碰到 session、語系、GAS endpoint 或學習中心頁風險

## 1. Single-Page UI Change

適用情境：版面、文案、按鈕、動畫、單一頁的互動調整。

先讀：

- 目標 `.html`
- 若有回跳或入口導向，再讀上一層 hub 頁

檢查點：

- 不要破壞現有導頁
- 若頁面有多語字典，文案要同步處理
- 若頁面依賴 session user，空狀態與未登入提示要保留

完成後驗證：

- 初始載入不報錯
- 既有按鈕與入口仍能導航

## 2. Navigation Or Role Flow Change

適用情境：新增角色入口、調整首頁導頁、改 hub 導航。

先讀：

- `index.html`
- 對應 hub 頁
- 目標子頁

必查：

- `sessionStorage.currentUser`
- role 命名是否用 `professor` 或 `researcher`
- 導向 URL 是否指到仍未接上後端的內容頁

完成後驗證：

- login/register 後能到正確頁
- logout 後能回到 `index.html`
- 未登入時受保護頁行為合理

## 3. GAS Endpoint Or API Change

適用情境：換 GAS URL、調整 action 名稱、修 API 請求格式。

先做：

1. 全 repo 搜尋 `script.google.com/macros/s/`
2. 盤點受影響頁面
3. 確認哪些頁共用同一個 endpoint，哪些不是
4. 優先確認 shared runtime 是否已經有對應 key，再決定要不要新增
5. 若 endpoint 仍是 placeholder，先決定是要補真實部署，還是只能安全地提供 fallback 與明確提示

檢查點：

- `fetch(..., mode: "cors")` 是否仍符合需求
- `no-cors` 是否只用於 logging/tracking
- 錯誤提示是否仍能告知使用者後端不可用
- 若使用 shared runtime fallback，要在回報裡明講它是推定值，不是 live 驗證結果

完成後驗證：

- 至少做靜態比對，確認沒有舊 URL 殘留
- 若外部 GAS 無法本地驗證，要在回報中明說

## 4. Session Or Auth Hardening

適用情境：調整登入、保護頁、使用者資訊格式。

先讀：

- `assets/js/aischool-shared.js`
- `index.html`
- `teacher.html`
- `student_subject.html`
- `professor.html`
- 任何依賴 `currentUser` 的子頁

必查：

- `currentUser` 欄位格式是否一致
- 是否有額外使用 `isLoggedIn`
- `redirectMsg` 是否仍在受保護頁流程中使用
- 學生深層頁是否仍直接讀寫 `sessionStorage.currentUser`

完成後驗證：

- 登入成功後可跨頁讀到 user
- 登出後 session 被清掉
- 受保護 professor 頁仍會攔未登入使用者

## 5. Promote A Learning Hub Page

適用情境：把空白頁或內容薄弱頁升級為正式的學生學習中心頁。

步驟：

1. 先確認它是從哪個 hub 被導過來
2. 若頁面屬於學生內容中心，優先沿用 `assets/css/student-hub.css` 與 `assets/js/student-hub.js`
3. 若需要登入，對齊現有 session 模式
4. 若需要追蹤或 API，優先從 `assets/js/aischool-shared.js` 取 endpoint
5. 把主導航接回去，避免新頁成為孤兒頁
6. 更新 `docs/architecture.md`
7. 視需要更新 `docs/examples/`

完成後驗證：

- 導頁不再落到空白頁
- 主導航與子導航都能找到新頁
- 文件中的頁面狀態同步更新

## 6. Dependency Or CDN Review

適用情境：頁面載入失敗、外部資源失效、要整理第三方依賴。

必查：

- Tailwind CDN
- Font Awesome CDN
- Chart.js CDN
- Cytoscape CDN
- Google Translate script

注意：

- 這些依賴是分散寫在各頁，不是集中管理
- 不要假設改一頁就全站生效

## 7. Manual Smoke Test

本 repo 沒有測試框架，預設 smoke test 如下：

1. 檢查 `index.html` 是否仍能登入/註冊並決定角色導向
2. 檢查 `student_subject.html` 是否能導到 `student_science.html` 與 `student_keyidea.html`
3. 檢查 `student_science.html` 的正式入口：
   - 雙語閱讀
   - 核心概念
   - 適性測驗
   - 虛擬實驗
   - CAP（國中教育會考自然科模擬）
   - CSAT（高中學測自然科戰略頁，保留舊檔名）
4. 檢查新的 subject/science learning hub 頁是否都能正常渲染
5. 檢查 `teacher.html` dashboard 與獨立工具頁導向
6. 檢查 `professor.html` 與至少一個 professor 子頁的 session 相依行為

回報方式：

- 說明哪些步驟是實際靜態驗證
- 說明哪些步驟因缺少 GAS 或外部服務只能推斷
- 額外列出 session、endpoint、內容頁與未驗證外部服務風險

## 8. GitHub Pages Preflight

適用情境：準備上線、剛整理完多頁面改動、想先確認 repo 本身是否適合靜態部署。

步驟：

1. 檢查所有 `.html` 的本地 `href` / `src` 是否都有對應檔案
2. 檢查是否存在 root-relative 路徑、大小寫風險或只在本機有效的連結
3. 檢查 repo 內是否有 `.github/workflows/pages.yml`、`CNAME`、`404.html` 等部署訊號
4. 盤點所有外部 CDN 與 GAS 依賴
5. 區分：
   - GitHub Pages 能保證的靜態檔案可達性
   - 仍需要人工驗證的外部服務可用性

完成後驗證：

- 能明確說出哪些頁面是「靜態可上線」
- 能明確說出哪些功能仍依賴 GAS / CDN / Google 服務
- 若 repo 沒有 Pages workflow，不要假設 GitHub 端一定已正確設定
