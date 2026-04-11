# Example: Align AI School Spreadsheet Config

## Prompt

```text
請讀取 G:\我的雲端硬碟\05AI資料\codex\aischool，
檢查我提供的 Google 試算表 ID 是否已和整個 AI School 系統對齊。
若沒有，請：
1. 全 repo 搜尋所有 spreadsheet ID、公開 CSV 與 docs.google.com/spreadsheets 連結
2. 優先把設定集中到 shared runtime
3. 區分哪些頁面走 GAS 私有讀取，哪些頁面走公開 CSV
4. 若新試算表不能匿名讀取，不要硬改壞 GitHub Pages，請保留安全 fallback 並明講阻塞點
5. 最後自動 commit / push
```

## What Good Output Looks Like

- 找出所有舊 spreadsheet ID 與舊 published CSV
- 不再讓 `student_science_bilingual.html` 與 `science_adaptive_testing.html` 各自硬寫不同來源
- shared runtime 內有清楚的 spreadsheet config
- 回報裡明講：
  - 主試算表是否已對齊
  - 新試算表是否能匿名公開讀取
  - 哪些地方仍暫時依賴 legacy published CSV

## Common Mistakes

- 只把 spreadsheet ID 改掉，卻忘記公開 CSV 並不是由 ID 自動推得
- 沒驗證匿名讀取能力，就把 GitHub Pages 的資料來源直接切到私有表
- 只改 `science_adaptive_testing.html`，卻漏掉 `student_science_bilingual.html`
- 沒有把 fallback 與阻塞點寫清楚，讓下一次維護的人以為系統已完全切換完成
