# Example: Add Cloud TTS To A Reading Page

## Prompt

```text
請讀取 G:\我的雲端硬碟\05AI資料\codex\aischool，
把中文朗讀頁接成「雲端 TTS 優先、裝置語音 fallback」。
需求：
1. 不可以把 API key 放進前端
2. 要優先改共用 runtime，而不是只在單頁硬寫
3. 雲端端點要能支援 audioUrl 或 base64 音訊
   - 也可以直接回傳 audio/mpeg、audio/aac、audio/wav 或 audio/ogg
   - 手機端優先使用 AAC，桌機可用 MP3
4. 手機中文語音失敗時要自動退回裝置語音
5. 文件要補上前後端契約
```

## What Good Output Looks Like

- 新增或更新共用 TTS runtime
- 頁面只負責呼叫 player，不直接處理供應商細節
- 文件明確寫出 `cloudTts` 是安全代理端點
- 中文自然男聲/女聲必須走雲端代理；瀏覽器內建語音只能當備援
- 後端應讀取 `voiceProfile`、`format`、`speed` 與 `speakingStyle`
- 回報裡說清楚：
  - 哪些部分已在前端完成
  - 哪些部分仍需要後端部署

## Common Mistakes

- 把 OpenAI、Google Cloud 或其他供應商金鑰直接寫進 HTML
- 只做雲端版本，卻拿掉裝置語音 fallback
- 沒定義後端 JSON 契約，導致前後端對不上
- 把女聲用很低 pitch 硬壓成男聲，會讓中文聽起來更像機器音
