# Example: Run Smoke Test

## When To Use

你要讓 Codex 先建立文件，再用文件驅動方式對 `aischool` 做一次架構盤點與靜態驗證。

## Suggested Prompt

```text
請先讀 AGENTS.md、docs/architecture.md、docs/workflows.md 與 docs/examples/，
再依 docs/workflows.md 的「Context Bootstrap」與「Manual Smoke Test」流程，
對 aischool 做一次文件驅動的 smoke test。
請回報：
1. 已檢查的主流程
2. placeholder 頁與未完成功能
3. GAS endpoint 與 session 相關風險
4. 哪些部分因缺少外部服務只能靜態推斷
```

## Good Output Looks Like

- 會先建立頁面分群
- 會指出 placeholder 頁仍在正式導航內
- 會區分本地可驗證與外部服務依賴
