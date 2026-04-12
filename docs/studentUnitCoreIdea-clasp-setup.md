# studentUnitCoreIdea clasp 連線步驟

目標：
- 讓我可以直接 `pull / push` 你的 live GAS 專案
- 專案 ID：`19-RcQi-_Ns9k2kNS2uU9EIvG8oNIMJeTiX1myOlVnIwKuceZUc0sHt81`

## 1) 先在你電腦安裝 Node.js

安裝 LTS 版 Node.js，安裝後重新開終端機。

## 2) 安裝 clasp

```powershell
npm install -g @google/clasp
clasp --version
```

## 3) Google 帳號授權

```powershell
clasp login --no-localhost
```

說明：
- 會出現 Google 驗證連結
- 你用擁有該 GAS 權限的帳號登入並同意授權

## 4) 在 repo 建立 GAS 工作目錄

建議在 `G:\我的雲端硬碟\05AI資料\codex\aischool\gas\studentUnitCoreIdea`。

```powershell
mkdir G:\我的雲端硬碟\05AI資料\codex\aischool\gas\studentUnitCoreIdea
cd G:\我的雲端硬碟\05AI資料\codex\aischool\gas\studentUnitCoreIdea
```

## 5) 建立 `.clasp.json`

內容如下：

```json
{
  "scriptId": "19-RcQi-_Ns9k2kNS2uU9EIvG8oNIMJeTiX1myOlVnIwKuceZUc0sHt81",
  "rootDir": "."
}
```

## 6) 把 live GAS 原始碼拉下來

```powershell
clasp pull
```

拉下來後通常會看到：
- `Code.gs`
- 其他 `.gs`
- `appsscript.json`

## 7) 我接手修改

完成以上步驟後，直接在這個對話告訴我：

`已完成 clasp login 與 clasp pull，路徑是 G:\我的雲端硬碟\05AI資料\codex\aischool\gas\studentUnitCoreIdea`

我就能直接改 live 原始碼，然後幫你：
- 套入 `U~Y` 快取邏輯
- 檢查回傳格式是否與前端相容
- `clasp push` 回 GAS

## 8) 發佈新版 Web App（必要）

`clasp push` 只是更新原始碼，不會自動更新部署版本。

請在 GAS 編輯器：
1. `Deploy` -> `Manage deployments`
2. 找到目前 Web App
3. `Edit` 後建立新版本
4. 更新部署

這樣前端呼叫的 `/exec` 才會吃到新程式。
