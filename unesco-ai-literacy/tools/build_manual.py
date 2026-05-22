from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "UNESCO_AI_Literacy_Manual_ZH_EN.pdf"

pdfmetrics.registerFont(TTFont("ManualCJK", r"C:\Windows\Fonts\msjh.ttc", subfontIndex=0))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="ManualTitle",
    parent=styles["Title"],
    fontName="ManualCJK",
    fontSize=22,
    leading=29,
    textColor=colors.HexColor("#0F172A"),
    spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="ManualHeading",
    parent=styles["Heading2"],
    fontName="ManualCJK",
    fontSize=15,
    leading=22,
    textColor=colors.HexColor("#1D4ED8"),
    spaceBefore=10,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="ManualBody",
    parent=styles["BodyText"],
    fontName="ManualCJK",
    fontSize=10.2,
    leading=16,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="ManualCode",
    parent=styles["BodyText"],
    fontName="ManualCJK",
    fontSize=8.2,
    leading=11,
    backColor=colors.HexColor("#F1F5F9"),
    borderColor=colors.HexColor("#CBD5E1"),
    borderWidth=0.5,
    borderPadding=6,
    spaceBefore=4,
    spaceAfter=8,
))


def p(text, style="ManualBody"):
    return Paragraph(text, styles[style])


def code(text):
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(safe.replace("\n", "<br/>"), styles["ManualCode"])


def cell(text, header=False):
    return Paragraph(str(text), ParagraphStyle(
        name=f"Cell{abs(hash(str(text))) % 10000000}",
        parent=styles["ManualBody"],
        fontSize=8.4,
        leading=12,
        spaceAfter=0,
        textColor=colors.white if header else colors.HexColor("#172033"),
    ))


def table(rows, widths):
    obj = Table([[cell(c, r == 0) for c in row] for r, row in enumerate(rows)], colWidths=widths, repeatRows=1)
    obj.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "ManualCJK"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.4),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    return obj


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.6 * cm, 1.1 * cm, "UNESCO AI Literacy Self-Assessment")
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.1 * cm, f"Page {doc.page}")
    canvas.restoreState()


story = []
story.append(p("UNESCO AI 素養自主評量網站<br/>UNESCO AI Literacy Self-Assessment Website", "ManualTitle"))
story.append(p("中英雙語操作與建置說明 / Bilingual Operation and Build Manual", "ManualHeading"))
story.append(p("版本日期：2026-05-22。本網站為正式學生使用頁，流程簡化為知情同意、登入、AI 對話、評量選單、作答與診斷回饋。"))
story.append(p("Version date: 2026-05-22. This is a public student-facing page with a simplified flow: consent, login, AI chat, assessment menu, answering, and diagnostic feedback."))

story.append(p("1. 學生操作流程 / Student Workflow", "ManualHeading"))
story.append(table([
    ["步驟 / Step", "操作 / Action"],
    ["1", "閱讀知情同意：系統會蒐集登入資料、對話內容、測驗選擇、作答結果與診斷建議。 / Read informed consent: the system records login, conversation, assessment choice, answers, and diagnostic feedback."],
    ["2", "輸入姓名、學號、班級與課堂代碼。 / Enter name, student ID, class, and course code."],
    ["3", "與 AI 學習夥伴對話，詢問 AICFT 或 AICFS 相關問題。 / Chat with the AI learning partner about AICFT or AICFS."],
    ["4", "按「進入評量」，選擇 AICFT 或 AICFS，選擇 10 至 30 題。 / Press Enter assessment, choose AICFT or AICFS, and select 10 to 30 questions."],
    ["5", "逐題作答。AI 會出題，系統會批改並顯示說明。 / Answer one question at a time. AI generates items and the system checks answers."],
    ["6", "查看總分、弱點面向、答錯題與 AI 診斷，下載 PDF。 / Review score, weak areas, missed items, AI diagnosis, and download PDF."]
], [2.3 * cm, 13.3 * cm]))

story.append(p("2. 多語介面 / Multilingual Interface", "ManualHeading"))
story.append(p("頁面右上角可切換繁體中文、English、Bahasa Indonesia、siSwati。切換後，知情同意、登入、對話、評量選單、題目與診斷文字會同步更新。"))
story.append(p("The language menu switches Traditional Chinese, English, Bahasa Indonesia, and siSwati. Consent, login, chat, assessment menu, questions, and diagnosis are updated together."))

story.append(p("3. 本機預覽指令 / Local Preview Commands", "ManualHeading"))
story.append(code('cd "G:\\我的雲端硬碟\\05AI資料\\codex\\aischool"\npython -m http.server 4180\n# Open:\n# http://localhost:4180/unesco-ai-literacy/'))

story.append(p("4. GitHub Pages 網址 / GitHub Pages URL", "ManualHeading"))
story.append(code("https://shiwen6674.github.io/aischool/unesco-ai-literacy/"))

story.append(p("5. GAS 串接 OpenAI API KEY / GAS OpenAI API Key Setup", "ManualHeading"))
story.append(p("請不要把 OpenAI API key 放在前端網頁。金鑰必須放在 Google Apps Script 的 Script Properties，由 GAS 代理呼叫 OpenAI Responses API。"))
story.append(p("Do not put the OpenAI API key in frontend files. Store it in Google Apps Script Script Properties and let GAS proxy calls to the OpenAI Responses API."))
story.append(code('1. Create a Google Apps Script project.\n2. Copy gas/openai-learning-partner/Code.gs and appsscript.json.\n3. Project Settings > Script Properties:\n   OPENAI_API_KEY = your key\n   OPENAI_MODEL = gpt-5.4-mini  # optional\n   SPREADSHEET_ID = your Google Sheet ID  # optional\n4. Deploy > Web app > Execute as Me > Anyone.\n5. Copy the web app URL into data/site-config.json.'))
story.append(code('{\n  "gasEndpoint": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"\n}'))

story.append(p("6. 紀錄與試算表 / Records and Spreadsheet", "ManualHeading"))
story.append(p("學生資料會先保存在瀏覽器 localStorage。若教師在 GAS 設定 SPREADSHEET_ID，系統會同步寫入 Consents、Logins、Chats、Assessments 四個工作表。欄位設計可參考 docs/AI_literacy_tracking_schema.xlsx。"))
story.append(p("Records are first kept in browser localStorage. If the teacher sets SPREADSHEET_ID in GAS, records are also written to four Google Sheets tabs: Consents, Logins, Chats, and Assessments. See docs/AI_literacy_tracking_schema.xlsx for the field design."))

story.append(p("7. 推送指令 / Push Commands", "ManualHeading"))
story.append(code('cd "G:\\我的雲端硬碟\\05AI資料\\codex\\aischool"\ngit add unesco-ai-literacy\ngit commit -m "Refine UNESCO AI literacy student assessment flow"\ngit push origin main'))

story.append(p("8. 教學提醒 / Teaching Notes", "ManualHeading"))
story.append(p("此評量用於學習診斷，不用於排名。若班級正式使用，教師應先說明資料保存時間、可查看資料的人，以及學生如何要求刪除或修正資料。"))
story.append(p("This assessment is for learning diagnosis, not ranking. For formal classroom use, teachers should explain retention, access, and how students can request deletion or correction."))

story.append(p("9. 來源 / Sources", "ManualHeading"))
story.append(p("UNESCO. (2024). AI competency framework for teachers. https://www.unesco.org/en/articles/ai-competency-framework-teachers"))
story.append(p("UNESCO. (2024). AI competency framework for students. https://www.unesco.org/en/articles/ai-competency-framework-students"))
story.append(p("OpenAI Responses API reference: https://platform.openai.com/docs/api-reference/responses"))

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    rightMargin=1.6 * cm,
    leftMargin=1.6 * cm,
    topMargin=1.5 * cm,
    bottomMargin=1.7 * cm,
    title="UNESCO AI Literacy Manual ZH EN",
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
