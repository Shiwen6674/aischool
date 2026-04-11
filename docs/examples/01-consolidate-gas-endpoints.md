# Example: Consolidate GAS Endpoints

## When To Use

你要整理分散在多個頁面的 GAS URL，或準備把網站正式上線到新的後端環境。

## Suggested Prompt

```text
請依 AGENTS.md 與 docs/workflows.md 的「GAS Endpoint Or API Change」流程，
盤點 aischool 所有硬編碼的 Apps Script endpoint，
說明哪些頁面共用、哪些頁面各自獨立，
再提出一個較安全的集中管理方案。
如果需要改檔，請同步更新受影響頁面與文件。
```

## Good Output Looks Like

- 先做全域盤點，不是一頁一頁碰運氣
- 能區分正式 API、logging、tracking
- 回報中會指出仍需人工驗證的外部 GAS 部分
