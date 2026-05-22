from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "UNESCO_AI_Literacy_Manual_ZH_EN.pdf"

pdfmetrics.registerFont(TTFont("ManualCJK", r"C:\Windows\Fonts\msjh.ttc", subfontIndex=0))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CJKTitle",
    parent=styles["Title"],
    fontName="ManualCJK",
    fontSize=22,
    leading=30,
    textColor=colors.HexColor("#0B5F67"),
    spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="CJKHeading",
    parent=styles["Heading2"],
    fontName="ManualCJK",
    fontSize=15,
    leading=22,
    textColor=colors.HexColor("#2457A6"),
    spaceBefore=12,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CJKBody",
    parent=styles["BodyText"],
    fontName="ManualCJK",
    fontSize=10.6,
    leading=17,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="ManualCode",
    parent=styles["BodyText"],
    fontName="ManualCJK",
    fontSize=8.4,
    leading=11,
    backColor=colors.HexColor("#F1F5F9"),
    borderColor=colors.HexColor("#CBD5E1"),
    borderWidth=0.5,
    borderPadding=6,
    spaceBefore=4,
    spaceAfter=8,
))


def p(text, style="CJKBody"):
    return Paragraph(text, styles[style])


def code(text):
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(safe.replace("\n", "<br/>"), styles["ManualCode"])


def cell(text, header=False):
    return Paragraph(str(text), ParagraphStyle(
        name=f"Cell{abs(hash(str(text))) % 10000000}",
        parent=styles["CJKBody"],
        fontSize=8.4,
        leading=12,
        spaceAfter=0,
        textColor=colors.white if header else colors.HexColor("#1D2433"),
    ))


def table_cells(rows):
    return [[cell(c, header=(r == 0)) for c in row] for r, row in enumerate(rows)]


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.6 * cm, 1.1 * cm, "UNESCO AI Literacy Self-Learning Assessment")
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.1 * cm, f"Page {doc.page}")
    canvas.restoreState()


story = []

story.append(p("UNESCO 教師與學生 AI 素養自主學習評量網站<br/>UNESCO AI Literacy Self-Learning Assessment Website", "CJKTitle"))
story.append(p("中英雙語操作與建置說明 / Bilingual Operation and Build Manual", "CJKHeading"))
story.append(p("版本日期：2026-05-22。這份手冊搭配 GitHub Pages 靜態網站使用，適合課堂示範、學生自主學習與教師說明資料流程。"))
story.append(p("Version date: 2026-05-22. This manual supports a static GitHub Pages website for classroom demonstration, self-learning, and explaining the data workflow."))

story.append(p("1. 網站目的 / Purpose", "CJKHeading"))
story.append(p("本網站結合東華大學學習關懷預警系統的概念、AI 適性測驗流程，以及 UNESCO 2024 年 AICFT 與 AICFS 兩份框架。使用者會依序完成知情同意、登入、框架選擇、RAG-style 對話、10-30 題自評、診斷回饋與 PDF 報告。"))
story.append(p("The site combines a learning-care warning concept, an adaptive-testing style flow, and UNESCO's 2024 AICFT and AICFS frameworks. Users complete consent, login, framework selection, RAG-style chat, 10-30 self-assessment items, diagnostic feedback, and a PDF report."))
story.append(p("重要限制：這是課堂原型，不是正式心理測驗，不含 IRT。靜態 GitHub Pages 無法安全保存全班資料，因此資料先存在瀏覽器 localStorage，並提供 CSV 匯出。正式版應串接 Google Sheets Apps Script、Firebase、Supabase 或校務系統。"))
story.append(p("Important limitation: this is a classroom prototype, not a formal psychometric test, and it does not include IRT. Static GitHub Pages cannot securely store class-wide data, so records are stored in browser localStorage and can be exported as CSV. A production version should connect Google Sheets Apps Script, Firebase, Supabase, or an institutional system."))

story.append(p("2. 學生操作流程 / Student Workflow", "CJKHeading"))
workflow = [
    ["步驟 / Step", "學生要做什麼 / What students do"],
    ["1", "閱讀知情同意，勾選同意後進入登入頁。 / Read informed consent, check agreement, and continue."],
    ["2", "輸入姓名、學號或代號、班級、角色與課堂代碼。 / Enter name, ID, class, role, and course code."],
    ["3", "選擇 AICFT 或 AICFS，選擇能力面向、層級、題數 10-30 題與學習模式。 / Choose AICFT or AICFS, aspect, level, 10-30 items, and mode."],
    ["4", "在對話頁詢問框架問題，或按「讓 AI 問我一題」進行反思。 / Ask framework questions or let the AI coach ask a reflection question."],
    ["5", "依實際能力作答，每題 1-4 分。 / Answer honestly on a 1-4 scale."],
    ["6", "查看總分、面向分數、預警訊號與建議，列印或另存 PDF。 / Review score, aspect profile, warning signal, recommendations, then print or save PDF."]
]
table = Table(table_cells(workflow), colWidths=[2.2 * cm, 13.4 * cm], repeatRows=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B5F67")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, -1), "ManualCJK"),
    ("FONTSIZE", (0, 0), (-1, -1), 8.4),
    ("LEADING", (0, 0), (-1, -1), 12),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
]))
story.append(table)

story.append(p("3. 本機預覽指令 / Local Preview Commands", "CJKHeading"))
story.append(p("教師若要在自己的電腦示範，先切換到專案根目錄，再啟動簡單伺服器。If the teacher wants to preview locally, go to the repository root and start a simple server."))
story.append(code('cd "G:\\我的雲端硬碟\\05AI資料\\codex\\aischool"\npython -m http.server 4173\n# Open in browser:\n# http://localhost:4173/unesco-ai-literacy/'))

story.append(p("4. GitHub Pages 部署與推送指令 / GitHub Pages Deployment Commands", "CJKHeading"))
story.append(p("本網站位於既有 GitHub 專案 Shiwen6674/aischool 的子目錄。推送後預期網址如下："))
story.append(code("https://shiwen6674.github.io/aischool/unesco-ai-literacy/"))
story.append(p("若要手動重做推送，可使用以下指令。注意：因為此專案根目錄已有其他未提交檔案，請只加入 unesco-ai-literacy 子目錄，避免誤提交其他資料。"))
story.append(code('cd "G:\\我的雲端硬碟\\05AI資料\\codex\\aischool"\ngit status --short\ngit add unesco-ai-literacy\ngit commit -m "Add UNESCO AI literacy assessment site"\ngit push origin main'))

story.append(p("5. 試算表資料設計 / Spreadsheet Data Design", "CJKHeading"))
story.append(p("網站提供 docs/AI_literacy_tracking_schema.xlsx 作為資料欄位設計。正式串接後可建立下列工作表："))
schema_rows = [
    ["Sheet", "Use"],
    ["Consent_Log", "知情同意紀錄 / consent events"],
    ["Login_Log", "登入紀錄 / classroom login records"],
    ["Chat_Log", "對話紀錄 / learner and AI coach messages"],
    ["Assessment_Log", "評量總表 / completed assessment attempts"],
    ["Dimension_Scores", "面向分數 / one row per dimension score"],
    ["Assessment_Items", "題庫欄位 / item bank fields"],
    ["Early_Warning_Rules", "預警規則 / green, yellow, red score bands"],
    ["Data_Dictionary", "資料字典 / terms and definitions"]
]
schema_table = Table(table_cells(schema_rows), colWidths=[4.4 * cm, 11.2 * cm], repeatRows=1)
schema_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2457A6")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, -1), "ManualCJK"),
    ("FONTSIZE", (0, 0), (-1, -1), 8.4),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]))
story.append(schema_table)

story.append(PageBreak())
story.append(p("6. 教師上課建議 / Teaching Suggestions", "CJKHeading"))
story.append(p("A. 先讓學生看知情同意，討論資料最小化、保存期間與誰能看到資料。"))
story.append(p("B. 讓一組學生選 AICFS，另一組扮演教師選 AICFT，比較兩個框架的面向與層級。"))
story.append(p("C. 對話頁可以要求學生提出一個問題，再把 AI 回答轉化成可觀察行為，最後用作答區檢核。"))
story.append(p("D. 回饋頁的綠、黃、紅訊號用於學習支持，不用於排名。教師可請學生根據最低面向寫下一個一週行動計畫。"))
story.append(p("A. Start with informed consent and discuss data minimization, retention, and access."))
story.append(p("B. Ask one group to use AICFS and another to role-play teachers using AICFT, then compare aspects and progression levels."))
story.append(p("C. On the chat page, ask students to pose a question, convert the response into observable behavior, and check it in the assessment area."))
story.append(p("D. Treat green, yellow, and red signals as support indicators, not rankings. Ask learners to write a one-week action plan for the lowest aspect."))

story.append(p("7. 來源 / Sources", "CJKHeading"))
story.append(p("UNESCO. (2024). AI competency framework for teachers. Official page: https://www.unesco.org/en/articles/ai-competency-framework-teachers"))
story.append(p("UNESCO. (2024). AI competency framework for students. Official page: https://www.unesco.org/en/articles/ai-competency-framework-students"))
story.append(p("PDF files are included in the sources folder for classroom RAG indexing. The UNESCO open access license is CC BY-SA 3.0 IGO, excluding marked third-party images."))

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
