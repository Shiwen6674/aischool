# AI School 綠界贊助會員後端

這個 Apps Script 用來支援 AI School 的週訂制 / 月訂制、AI 額度狀態、綠界付款回傳，以及密碼修改 Email 驗證。

目前版本採「付款後開通有效期」模式：週訂制開通 7 天、月訂制開通 30 天。這比自動續扣更適合先上線驗證需求，也比較不容易產生退費與續扣爭議。若之後要改成真正的信用卡定期定額自動續扣，需要另接綠界定期定額付款與每期付款結果通知。

## 部署

1. Apps Script 專案已建立：`https://script.google.com/d/1Xh4aMyTteUdw9NdD0ri7sAuZn3gQ4fl1BXU7MJKJYDej6m3RHdsfa98m/edit`
2. Web App 已部署：`https://script.google.com/macros/s/AKfycbzuxjkR2kM_fPGu9-5hNXH78YFkpONi4uH6i3XMcSdRTGqgdQod3lytlx7kOeRrTfGa4g/exec`
3. 專案設定 > 指令碼屬性至少加入以下三個綠界機密：
   - `ECPAY_MERCHANT_ID`
   - `ECPAY_HASH_KEY`
   - `ECPAY_HASH_IV`
4. 其餘設定已有安全預設值：
   - `SPREADSHEET_ID`: `1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8`
   - `ECPAY_AIO_URL`: `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`
   - `ECPAY_RETURN_URL`: `https://script.google.com/macros/s/AKfycbzuxjkR2kM_fPGu9-5hNXH78YFkpONi4uH6i3XMcSdRTGqgdQod3lytlx7kOeRrTfGa4g/exec`
   - `ECPAY_CLIENT_BACK_URL`: `https://shiwen6674.github.io/aischool/account_settings.html`
5. 若 Web App 第一次開啟出現授權畫面，請以 `swc545@gmail.com` 完成授權。
6. 授權後以 POST 呼叫 `{ "action": "setup" }`，建立 `MembershipOrders`、`PasswordChangeRequests`，並補齊使用者表會員欄位。
7. 前端 `membershipBilling` 已回填上述 `/exec` URL。

## 方案

- 週訂制：NT$150 / 7 days
- 月訂制：NT$500 / 30 days
- 每日 AI 保護額度：NT$15
- 每小時 AI 保護額度：NT$2
- 免費用戶：前端每日 10 分鐘，且 20 分鐘未操作會自動登出
- 指定不限額帳號：`student@gmail.com`、`teacher@gmail.com`、`researcher@gmail.com`

## 安全提醒

綠界 `HashKey` 與 `HashIV` 不可放在前端。這個後端會在 Apps Script 端產生 CheckMacValue，前端只收到付款表單參數並跳轉到綠界付款頁。

目前密碼修改會依既有試算表密碼欄位運作。若正式上線，建議把 Auth Hub 一併升級為雜湊密碼與一次性驗證 token 流程。

綠界官方文件重點：

- 全方位金流訂單需以前端表單 POST 導轉到 `AioCheckOut/V5`。
- `EncryptType=1` 使用 SHA256 產生 CheckMacValue。
- 後端收到付款通知後必須驗證 CheckMacValue，成功處理後回應 `1|OK`。

參考：

- https://developers.ecpay.com.tw/?p=16449
- https://developers.ecpay.com.tw/2902/
- https://developers.ecpay.com.tw/2868/
