# Example: Run A GitHub Pages Preflight

## Prompt

```text
請讀取 G:\我的雲端硬碟\05AI資料\codex\aischool，
針對 GitHub Pages 上線前做一次 preflight 檢查。
請至少檢查：
1. 是否有缺失的本地資產或連結
2. 是否存在 root-relative 路徑或大小寫風險
3. 是否有 `.github/workflows/pages.yml`
4. 哪些功能其實依賴外部 CDN 或 GAS，Pages 上線不代表功能可用
最後請回報：
- 可直接上線的部分
- 仍需人工確認的部分
- 最優先該補的部署風險
```

## What Good Output Looks Like

- 明確區分：
  - GitHub Pages 可提供的靜態托管能力
  - 仍依賴外部 GAS / CDN / Google 服務的功能
- 指出 repo 內是否存在 Pages workflow
- 說明本地靜態檢查是已驗證，哪些只是推論
- 若發現缺少 workflow 或設定檔，不要直接假設 repo 已正確配置 Pages

## Common Mistakes

- 只說「網站是靜態頁，所以可以上線」而忽略外部 GAS 依賴
- 把 GitHub Pages 的成功發布誤當成功能可用
- 沒檢查本地資產連結與路徑大小寫
