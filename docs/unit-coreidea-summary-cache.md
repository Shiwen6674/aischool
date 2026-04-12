# 單元重點精熟摘要快取規格

對應前端頁面：
- `G:\我的雲端硬碟\05AI資料\codex\aischool\science_unit_coreidea.html`

對應 GAS 專案：
- `https://script.google.com/d/19-RcQi-_Ns9k2kNS2uU9EIvG8oNIMJeTiX1myOlVnIwKuceZUc0sHt81/edit`

## 目標

把「單元重點精熟」改成先讀試算表 `Sheet1!U:U` 的摘要快取。

流程應該是：
1. 先依使用者選到的單元定位對應列。
2. 讀取 `T` 欄概念節點與 `U` 欄單元概念摘要。
3. 如果 `U` 欄已有內容，直接回傳，不再呼叫生成模型。
4. 如果 `U` 欄空白，才呼叫模型生成摘要。
5. 生成成功後，立即回寫同列 `U` 欄。
6. 前端之後直接顯示 `U` 欄內容，減少延遲與 API 成本。

## 前端已對齊的請求格式

前端 `startGeneration()` 現在會送出：

```json
{
  "action": "get_content_and_generate",
  "filters": {
    "stage": "...",
    "publisher": "...",
    "grade": "...",
    "semester": "...",
    "unitName": "..."
  },
  "client_options": {
    "prefer_local_cache": true,
    "prefer_sheet_summary": true,
    "concept_column": "T",
    "summary_column": "U",
    "summary_format": "structured_summary_v1"
  }
}
```

GAS 若尚未使用 `client_options`，可先忽略；若要正式接快取，可直接依這組欄位設定實作。

## 建議的 GAS 主流程

### `action = get_content_and_generate`

1. 用 `filters` 在 `Sheet1` 找到唯一資料列。
2. 取出：
   - `I` 欄：原始課文
   - `T` 欄：概念節點
   - `U` 欄：單元概念摘要快取
3. 如果 `U` 欄不為空：
   - 直接回傳
   - `summary_metadata.source = "sheet_cache"`
4. 如果 `U` 欄為空：
   - 以 `I` 欄課文 + `T` 欄概念節點生成摘要
   - 生成格式建議存成 JSON 字串
   - 寫回 `U` 欄
   - 回傳
   - `summary_metadata.source = "generated_and_saved"`

## `U` 欄建議儲存格式

建議用 JSON 字串，而不是直接存 HTML。

原因：
- 比較容易維護層次結構
- 前端可統一換版面
- 之後要調色、加卡片、加圖示時不用重寫整欄 HTML

### `structured_summary_v1`

```json
{
  "title": "單元主題",
  "lead": "用 1 到 2 句話說明本單元最核心的學習重點。",
  "chips": ["概念節點整理", "層次筆記"],
  "sections": [
    {
      "label": "先掌握",
      "heading": "基礎概念",
      "body": "先理解最核心的名詞、構造或現象。",
      "points": [
        "重點 1",
        "重點 2"
      ],
      "accent": "sky"
    },
    {
      "label": "重點整理",
      "heading": "重要內容",
      "body": "把相關概念放在一起看，理解主題脈絡。",
      "points": [
        "重點 3",
        "重點 4"
      ],
      "accent": "indigo"
    },
    {
      "label": "觀念連結",
      "heading": "關係理解",
      "body": "說清楚因果、作用、變化或彼此影響。",
      "points": [
        "重點 5",
        "重點 6"
      ],
      "accent": "emerald"
    },
    {
      "label": "應用延伸",
      "heading": "生活應用",
      "body": "把重點拉回生活情境、實作活動或保育素養。",
      "points": [
        "重點 7",
        "重點 8"
      ],
      "accent": "amber"
    }
  ],
  "relationships": [
    {
      "from": "概念 A",
      "label": "影響",
      "to": "概念 B"
    }
  ],
  "takeaways": [
    "學習提醒 1",
    "學習提醒 2"
  ]
}
```

## 前端已支援的摘要來源

前端目前已可處理這些來源：
- `data.summary.summary_html`
- `data.summary.html`
- `data.summary.content`
- `data.summary.text`
- `data.summary.structured_notes`
- `data.summary.unit_concept_summary`
- `data.raw_content.unit_concept_summary`
- `data.raw_content.summary_json`
- 純文字概念節點字串（會自動轉成分層筆記樣式）

## 建議 GAS 回傳格式

```json
{
  "status": "success",
  "data": {
    "topic": "單元名稱",
    "summary": {
      "structured_notes": {
        "...": "..."
      }
    },
    "summary_metadata": {
      "source": "sheet_cache"
    },
    "raw_content": {
      "unitName": "單元名稱",
      "unit_concept_summary": "{...json string...}"
    },
    "keywords": [],
    "mindMap": "",
    "myths": [],
    "quiz": []
  }
}
```

## 實作提醒

- `U1` 標題建議命名為 `單元概念摘要`
- 如果生成內容有版本升級需求，可在 JSON 裡加 `version`
- 若 `U` 欄內容不是合法 JSON，前端仍會退回一般 HTML / 文字摘要顯示
- 若要立即節省成本，最優先的後端修改就是：`先查 U，空白才生成`
