# Example: Harden Login Session

## When To Use

你要改善登入可靠性、修跨頁 session 問題，或清掉 `DEV_BYPASS_LOGIN` 這類開發開關。

## Suggested Prompt

```text
請依 AGENTS.md 與 docs/workflows.md 的「Session Or Auth Hardening」流程，
盤點 aischool 的登入與 session 狀態流，
找出 `currentUser`、`isLoggedIn`、`redirectMsg` 與語言 key 的不一致，
提出並實作一個最小但安全的整理方案。
```

## Good Output Looks Like

- 會先盤點 key，不直接全站機械取代
- 會明講 `professor/researcher` 的命名漂移
- 會保留需要的未登入防護
