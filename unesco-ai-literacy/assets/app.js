(function () {
  "use strict";

  const STORE_KEY = "UNESCO_AI_LITERACY_RECORDS_V1";
  const USER_KEY = "UNESCO_AI_LITERACY_CURRENT_USER";
  const QUIZ_KEY = "UNESCO_AI_LITERACY_QUIZ_DRAFT";

  const state = {
    lang: localStorage.getItem("UNESCO_AI_LITERACY_LANG") || "zh",
    route: "consent",
    frameworks: null,
    rag: [],
    bank: null,
    user: null,
    messages: [],
    quizItems: [],
    answers: {},
    result: null,
    selection: {
      framework: "aicfs",
      dimension: "all",
      level: "all",
      count: 20,
      mode: "ask"
    }
  };

  const i18n = {
    zh: {
      appTitle: "UNESCO AI 素養自主學習評量",
      appSubtitle: "AICFT / AICFS RAG learning-care prototype",
      language: "語言",
      navChoose: "選擇",
      navChat: "對話",
      navFeedback: "回饋",
      stepConsent: "知情同意",
      stepLogin: "登入",
      stepChoose: "選擇",
      stepChat: "對話",
      stepQuiz: "作答",
      stepFeedback: "診斷",
      warningTitle: "學習關懷訊號",
      signalGood: "80-100：穩定發展",
      signalWatch: "60-79：需要補強",
      signalAlert: "0-59：優先關懷",
      sourceTitle: "RAG 資料源",
      schemaLink: "資料表設計",
      manualLink: "中英手冊 PDF",
      heroEyebrow: "Learning care + RAG + self-assessment",
      heroTitle: "用 UNESCO AI 能力框架做自主學習評量",
      heroText: "學生或教師可先同意資料使用、登入、選擇 AICFT 或 AICFS、進行 AI 問答與 10-30 題自評，最後取得預警式診斷與 PDF 報告。",
      consentEyebrow: "Step 1",
      consentTitle: "知情同意",
      consentText: "本網站為教學展示與自主學習評量原型。你的登入、對話與評量資料會先保存在本機瀏覽器，可由你匯出 CSV；若教師日後串接試算表，應另行告知資料用途、保存期間與權限。",
      consentDataTitle: "會記錄的資料",
      consentDataText: "姓名、班級、角色、同意時間、框架選擇、對話提問、評量答案、分數與建議。",
      consentPurposeTitle: "使用目的",
      consentPurposeText: "協助學習者理解 AI 素養、追蹤自我進展、產生診斷回饋，並供教師示範學習分析設計。",
      consentLimitTitle: "限制",
      consentLimitText: "此版不是正式心理測驗，也不含 IRT。分數是學習診斷訊號，不應作為高風險決策依據。",
      consentAgree: "我已理解並同意以上說明，願意開始自主學習評量。",
      startLogin: "同意並前往登入",
      loginEyebrow: "Step 2",
      loginTitle: "登入資料",
      loginText: "這裡採教室原型登入，不驗證密碼。正式上線請改用學校帳號、Google 登入或 Firebase Authentication。",
      nameLabel: "姓名",
      accountLabel: "學號/教師代號",
      classLabel: "班級/單位",
      emailLabel: "Email",
      roleLabel: "角色",
      roleStudent: "學生",
      roleTeacher: "教師",
      roleResearcher: "研究/助教",
      passwordLabel: "課堂代碼",
      loginSubmit: "儲存登入並前往選擇",
      chooseEyebrow: "Step 3",
      chooseTitle: "選擇框架與題數",
      chooseText: "多語連動選單會依框架更新能力面向與層級。題數可選 10-30 題，系統會盡量平均抽取各面向。",
      frameworkLabel: "框架",
      dimensionLabel: "能力面向",
      levelLabel: "層級",
      countLabel: "測驗題數",
      modeLabel: "學習模式",
      modeAsk: "我問 AI",
      modeCoach: "AI 問我",
      modeAssessment: "直接作答",
      goChat: "前往對話",
      startQuiz: "開始作答",
      chatEyebrow: "Step 4",
      chatTitle: "AICFT / AICFS 對話區",
      chatText: "這是本機 RAG-style 對話：系統會從兩份 PDF 摘要索引找最相關內容，產生可追溯的學習回應。若要真正串接大型語言模型，可在正式版加入 API 後端。",
      coachQuestion: "讓 AI 問我一題",
      sendQuestion: "送出問題",
      chatToQuiz: "完成對話，開始作答",
      quizEyebrow: "Step 5",
      quizTitle: "試題作答區",
      quizText: "請依目前能力與實際行為作答。這不是考倒你的測驗，而是幫你知道下一步要補哪裡。",
      autosave: "已自動暫存",
      backChoose: "返回選擇",
      submitQuiz: "提交並看診斷",
      feedbackEyebrow: "Step 6",
      feedbackTitle: "診斷回饋",
      feedbackText: "報告會整合總分、面向分數、預警訊號與下一步學習建議。可直接列印或另存 PDF。",
      feedbackEmpty: "尚未完成作答。請先前往選擇並開始評量。",
      printReport: "列印 / 另存 PDF 診斷",
      exportLogin: "匯出登入 CSV",
      exportChat: "匯出對話 CSV",
      exportAssessment: "匯出評量 CSV",
      clearData: "清除本機資料",
      footerText: "Prototype for classroom use. Sources: UNESCO AICFT and AICFS, 2024. Local data stays in this browser unless exported.",
      allDimensions: "全部面向",
      allLevels: "全部層級",
      dimensionHeader: "能力面向",
      sourceHeader: "來源",
      levelHeader: "層級",
      competencyHeader: "能力區塊",
      loginRequired: "請先完成知情同意與登入。",
      consentRequired: "請先勾選同意，才能繼續。",
      hello: "你好",
      aiName: "AI 學習教練",
      userName: "我",
      sourceLabel: "依據",
      noQuestion: "請先輸入你的問題。",
      quizMissing: "還有題目沒有作答，請完成所有題目。",
      noRecords: "目前沒有可匯出的資料。",
      scoreTitle: "總分",
      statusGood: "穩定發展",
      statusWatch: "需要補強",
      statusAlert: "優先關懷",
      dimensionScores: "面向分數",
      recommendations: "下一步建議",
      lowFocus: "優先補強",
      clearConfirm: "確定要清除本機保存的登入、對話與評量資料嗎？",
      cleared: "本機資料已清除。",
      defaultChat: "你可以問：AICFS 的 AI system design 怎麼評量？或 AICFT 的 AI pedagogy 怎麼設計課堂活動？"
    },
    en: {
      appTitle: "UNESCO AI Literacy Self-Learning Assessment",
      appSubtitle: "AICFT / AICFS RAG learning-care prototype",
      language: "Language",
      navChoose: "Select",
      navChat: "Chat",
      navFeedback: "Feedback",
      stepConsent: "Consent",
      stepLogin: "Login",
      stepChoose: "Select",
      stepChat: "Chat",
      stepQuiz: "Answer",
      stepFeedback: "Report",
      warningTitle: "Learning-Care Signals",
      signalGood: "80-100: Stable growth",
      signalWatch: "60-79: Needs support",
      signalAlert: "0-59: Priority care",
      sourceTitle: "RAG Sources",
      schemaLink: "Spreadsheet schema",
      manualLink: "Bilingual manual PDF",
      heroEyebrow: "Learning care + RAG + self-assessment",
      heroTitle: "Self-assess AI literacy with UNESCO competency frameworks",
      heroText: "Students or teachers can consent, log in, choose AICFT or AICFS, chat with a local RAG-style coach, answer 10-30 self-assessment items, and print a diagnostic PDF report.",
      consentEyebrow: "Step 1",
      consentTitle: "Informed Consent",
      consentText: "This site is a classroom demonstration and self-learning assessment prototype. Login, chat, and assessment data are stored in this browser and can be exported as CSV. If a teacher later connects a spreadsheet, data purpose, retention, and permissions must be explained separately.",
      consentDataTitle: "Data Recorded",
      consentDataText: "Name, class, role, consent time, framework choice, chat questions, assessment answers, scores, and recommendations.",
      consentPurposeTitle: "Purpose",
      consentPurposeText: "To help learners understand AI literacy, track progress, generate diagnostic feedback, and let teachers demonstrate learning analytics design.",
      consentLimitTitle: "Limitations",
      consentLimitText: "This is not a formal psychological test and does not include IRT. Scores are learning signals and should not be used for high-stakes decisions.",
      consentAgree: "I understand and agree to the explanation above and want to begin the self-learning assessment.",
      startLogin: "Agree and go to login",
      loginEyebrow: "Step 2",
      loginTitle: "Login Information",
      loginText: "This classroom prototype does not verify passwords. A production site should use school accounts, Google login, or Firebase Authentication.",
      nameLabel: "Name",
      accountLabel: "Student/teacher ID",
      classLabel: "Class/Unit",
      emailLabel: "Email",
      roleLabel: "Role",
      roleStudent: "Student",
      roleTeacher: "Teacher",
      roleResearcher: "Research/TA",
      passwordLabel: "Course code",
      loginSubmit: "Save login and select framework",
      chooseEyebrow: "Step 3",
      chooseTitle: "Choose Framework and Item Count",
      chooseText: "Linked multilingual menus update aspects and levels by framework. Choose 10-30 items; the system balances items across aspects when possible.",
      frameworkLabel: "Framework",
      dimensionLabel: "Competency aspect",
      levelLabel: "Level",
      countLabel: "Number of items",
      modeLabel: "Learning mode",
      modeAsk: "I ask AI",
      modeCoach: "AI asks me",
      modeAssessment: "Go to assessment",
      goChat: "Go to chat",
      startQuiz: "Start assessment",
      chatEyebrow: "Step 4",
      chatTitle: "AICFT / AICFS Chat",
      chatText: "This is a local RAG-style chat. It retrieves relevant entries from the two PDF summary indexes and generates traceable learning responses. A production version can add an API backend for a real LLM.",
      coachQuestion: "Let AI ask me",
      sendQuestion: "Send question",
      chatToQuiz: "Finish chat and start assessment",
      quizEyebrow: "Step 5",
      quizTitle: "Assessment Items",
      quizText: "Answer based on your current ability and actual behavior. This is not a trap; it helps identify the next learning step.",
      autosave: "Autosaved",
      backChoose: "Back to selection",
      submitQuiz: "Submit and view diagnosis",
      feedbackEyebrow: "Step 6",
      feedbackTitle: "Diagnostic Feedback",
      feedbackText: "The report combines total score, aspect scores, warning signals, and next-step suggestions. You can print or save as PDF.",
      feedbackEmpty: "No assessment has been completed yet. Please select a framework and begin.",
      printReport: "Print / Save PDF diagnosis",
      exportLogin: "Export login CSV",
      exportChat: "Export chat CSV",
      exportAssessment: "Export assessment CSV",
      clearData: "Clear local data",
      footerText: "Prototype for classroom use. Sources: UNESCO AICFT and AICFS, 2024. Local data stays in this browser unless exported.",
      allDimensions: "All aspects",
      allLevels: "All levels",
      dimensionHeader: "Aspect",
      sourceHeader: "Source",
      levelHeader: "Level",
      competencyHeader: "Competency block",
      loginRequired: "Please complete consent and login first.",
      consentRequired: "Please check the consent box before continuing.",
      hello: "Hello",
      aiName: "AI Learning Coach",
      userName: "Me",
      sourceLabel: "Based on",
      noQuestion: "Please enter your question first.",
      quizMissing: "Some items are still unanswered. Please complete all items.",
      noRecords: "No data is available for export yet.",
      scoreTitle: "Total score",
      statusGood: "Stable growth",
      statusWatch: "Needs support",
      statusAlert: "Priority care",
      dimensionScores: "Aspect scores",
      recommendations: "Next-step recommendations",
      lowFocus: "Priority focus",
      clearConfirm: "Clear locally stored login, chat, and assessment data?",
      cleared: "Local data has been cleared.",
      defaultChat: "You can ask: How can AICFS AI system design be assessed? Or how can AICFT AI pedagogy shape classroom activities?"
    }
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key]) || i18n.zh[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return {
        consents: Array.isArray(parsed.consents) ? parsed.consents : [],
        logins: Array.isArray(parsed.logins) ? parsed.logins : [],
        chats: Array.isArray(parsed.chats) ? parsed.chats : [],
        assessments: Array.isArray(parsed.assessments) ? parsed.assessments : []
      };
    } catch (_) {
      return { consents: [], logins: [], chats: [], assessments: [] };
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORE_KEY, JSON.stringify(records));
  }

  function record(type, payload) {
    const records = getRecords();
    const entry = Object.assign({
      record_id: uid(type),
      client_time: nowIso(),
      lang: state.lang,
      session_id: sessionStorage.getItem("UNESCO_AI_LITERACY_SESSION") || makeSession()
    }, state.user || {}, payload || {});
    records[type].push(entry);
    saveRecords(records);
    return entry;
  }

  function makeSession() {
    const value = uid("session");
    sessionStorage.setItem("UNESCO_AI_LITERACY_SESSION", value);
    return value;
  }

  function loadUser() {
    try {
      state.user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (_) {
      state.user = null;
    }
  }

  function saveUser(user) {
    state.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function applyLanguage() {
    localStorage.setItem("UNESCO_AI_LITERACY_LANG", state.lang);
    document.documentElement.lang = state.lang === "zh" ? "zh-Hant" : "en";
    qsa("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    const chatInput = qs("#chatInput");
    if (chatInput) {
      chatInput.placeholder = state.lang === "zh"
        ? "請問 AICFS 的 Ethics by design 是什麼？"
        : "What does Ethics by design mean in AICFS?";
    }
    if (state.frameworks) {
      populateLinkedMenus();
      renderFrameworkMatrix();
      renderQuestions();
      renderFeedback();
      renderMessages();
    }
  }

  function setRoute(route) {
    if (route !== "consent" && route !== "login" && !state.user) {
      alert(t("loginRequired"));
      route = "login";
    }
    state.route = route;
    qsa("[data-route-section]").forEach((section) => {
      section.classList.toggle("active", section.dataset.routeSection === route);
    });
    qsa("[data-step-dot]").forEach((step) => {
      step.classList.toggle("active", step.dataset.stepDot === route);
    });
    const target = qs(`#${route}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function framework() {
    return state.frameworks.frameworks[state.selection.framework];
  }

  function labelOf(value) {
    if (!value) return "";
    return state.lang === "zh" ? value.zh : value.en;
  }

  function dimensionLabel(id) {
    const dim = framework().dimensions.find((item) => item.id === id);
    return dim ? labelOf(dim) : t("allDimensions");
  }

  function levelLabel(id) {
    const level = framework().levels.find((item) => item.id === id);
    return level ? labelOf(level) : t("allLevels");
  }

  function populateLinkedMenus() {
    const frameworkSelect = qs("#frameworkSelect");
    const dimensionSelect = qs("#dimensionSelect");
    const levelSelect = qs("#levelSelect");
    if (!frameworkSelect || !dimensionSelect || !levelSelect || !state.frameworks) return;

    const previousFramework = state.selection.framework;
    frameworkSelect.innerHTML = Object.entries(state.frameworks.frameworks)
      .map(([id, item]) => `<option value="${id}">${escapeHtml(labelOf(item.label))}</option>`)
      .join("");
    frameworkSelect.value = previousFramework;

    const current = framework();
    dimensionSelect.innerHTML = [
      `<option value="all">${escapeHtml(t("allDimensions"))}</option>`,
      ...current.dimensions.map((dim) => `<option value="${dim.id}">${escapeHtml(labelOf(dim))}</option>`)
    ].join("");
    if (!dimensionSelect.querySelector(`option[value="${state.selection.dimension}"]`)) {
      state.selection.dimension = "all";
    }
    dimensionSelect.value = state.selection.dimension;

    levelSelect.innerHTML = [
      `<option value="all">${escapeHtml(t("allLevels"))}</option>`,
      ...current.levels.map((level) => `<option value="${level.id}">${escapeHtml(labelOf(level))}</option>`)
    ].join("");
    if (!levelSelect.querySelector(`option[value="${state.selection.level}"]`)) {
      state.selection.level = "all";
    }
    levelSelect.value = state.selection.level;

    qs("#countSelect").value = String(state.selection.count);
    qs("#modeSelect").value = state.selection.mode;
  }

  function renderFrameworkMatrix() {
    const container = qs("#frameworkMatrix");
    if (!container || !state.frameworks) return;
    const current = framework();
    const rows = current.dimensions.map((dim) => {
      const comps = current.levels.map((level) => {
        const comp = dim.competencies[level.id];
        return `<td><strong>${escapeHtml(labelOf(level))}</strong><br>${escapeHtml(labelOf(comp))}</td>`;
      }).join("");
      return `<tr><th scope="row">${escapeHtml(labelOf(dim))}</th>${comps}</tr>`;
    }).join("");
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(t("dimensionHeader"))}</th>
            ${current.levels.map((level) => `<th>${escapeHtml(labelOf(level))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0);
  }

  function stableShuffle(items, seedText) {
    return items
      .map((item) => ({ item, key: hashString(`${seedText}:${item.id}`) }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.item);
  }

  function selectQuizItems() {
    const all = state.bank.items.filter((item) => item.framework === state.selection.framework);
    let filtered = all.filter((item) => {
      const dimOk = state.selection.dimension === "all" || item.dimension === state.selection.dimension;
      const levelOk = state.selection.level === "all" || item.level === state.selection.level;
      return dimOk && levelOk;
    });
    if (filtered.length < state.selection.count) filtered = all;

    const seed = `${state.user?.account || "guest"}:${state.selection.framework}:${state.selection.count}:${new Date().toISOString().slice(0, 10)}`;
    const shuffled = stableShuffle(filtered, seed);
    const groups = new Map();
    shuffled.forEach((item) => {
      if (!groups.has(item.dimension)) groups.set(item.dimension, []);
      groups.get(item.dimension).push(item);
    });
    const dims = Array.from(groups.keys()).sort();
    const selected = [];
    while (selected.length < state.selection.count && dims.some((dim) => groups.get(dim).length)) {
      dims.forEach((dim) => {
        const group = groups.get(dim);
        if (group.length && selected.length < state.selection.count) selected.push(group.shift());
      });
    }
    state.quizItems = selected;
    state.answers = {};
    localStorage.removeItem(QUIZ_KEY);
    renderQuestions();
  }

  function renderQuestions() {
    const list = qs("#questionList");
    if (!list || !state.bank || !state.quizItems.length) return;
    const scale = state.bank.scale;
    list.innerHTML = state.quizItems.map((item, index) => {
      const name = `q_${item.id}`;
      const checked = state.answers[item.id];
      const options = scale.map((s) => `
        <label>
          <input type="radio" name="${name}" value="${s.value}" ${String(checked) === String(s.value) ? "checked" : ""}>
          <span>${s.value}. ${escapeHtml(labelOf(s))}</span>
        </label>
      `).join("");
      return `
        <article class="question-card" data-question-id="${item.id}">
          <div class="question-meta">
            <span class="tag">Q${index + 1}</span>
            <span class="tag">${escapeHtml(dimensionLabel(item.dimension))}</span>
            <span class="tag">${escapeHtml(levelLabel(item.level))}</span>
          </div>
          <h3>${escapeHtml(labelOf(item))}</h3>
          <div class="scale-row">${options}</div>
        </article>
      `;
    }).join("");
    updateProgress();
  }

  function updateProgress() {
    const total = state.quizItems.length;
    const answered = Object.keys(state.answers).filter((id) => state.answers[id]).length;
    const pct = total ? Math.round((answered / total) * 100) : 0;
    qs("#progressText").textContent = `${answered} / ${total}`;
    qs("#progressBar").style.width = `${pct}%`;
    localStorage.setItem(QUIZ_KEY, JSON.stringify({
      selection: state.selection,
      items: state.quizItems.map((item) => item.id),
      answers: state.answers,
      updated_at: nowIso()
    }));
  }

  function getStatus(score) {
    if (score >= 80) return { key: "good", label: t("statusGood") };
    if (score >= 60) return { key: "watch", label: t("statusWatch") };
    return { key: "alert", label: t("statusAlert") };
  }

  function calculateResult() {
    const byDim = new Map();
    state.quizItems.forEach((item) => {
      const value = Number(state.answers[item.id] || 0);
      if (!byDim.has(item.dimension)) byDim.set(item.dimension, { raw: 0, count: 0 });
      const bucket = byDim.get(item.dimension);
      bucket.raw += value;
      bucket.count += 1;
    });
    const dims = Array.from(byDim.entries()).map(([id, bucket]) => ({
      id,
      label: dimensionLabel(id),
      score: Math.round((bucket.raw / (bucket.count * 4)) * 100),
      count: bucket.count
    })).sort((a, b) => a.score - b.score);
    const totalRaw = Object.values(state.answers).reduce((sum, value) => sum + Number(value), 0);
    const total = Math.round((totalRaw / (state.quizItems.length * 4)) * 100);
    const low = dims.filter((dim) => dim.score < 70);
    const status = getStatus(total);
    const result = {
      assessment_id: uid("assessment"),
      framework: state.selection.framework,
      framework_label: labelOf(framework().label),
      question_count: state.quizItems.length,
      total_score: total,
      status: status.key,
      status_label: status.label,
      dimensions: dims,
      low_focus: low,
      completed_at: nowIso()
    };
    state.result = result;
    record("assessments", {
      assessment_id: result.assessment_id,
      framework: result.framework,
      framework_label: result.framework_label,
      question_count: result.question_count,
      total_score: result.total_score,
      status: result.status_label,
      selection_json: JSON.stringify(state.selection),
      answers_json: JSON.stringify(state.answers),
      dimensions_json: JSON.stringify(dims),
      low_focus_json: JSON.stringify(low)
    });
    localStorage.removeItem(QUIZ_KEY);
    return result;
  }

  function recommendationText(dim) {
    const zh = {
      human: "補強人類能動性與問責：每次使用 AI 後寫下自己的判斷、風險與最後決定。",
      ethics: "補強倫理與安全：練習檢查資料隱私、偏誤、透明揭露與引用規則。",
      foundations: "補強 AI 基礎：用一張圖說明資料、模型、提示詞、輸出與檢核流程。",
      techniques: "補強 AI 技術應用：練習重寫提示詞，並用兩個來源查證 AI 回答。",
      pedagogy: "補強 AI 教學法：先寫學習目標，再設計 AI 使用規則、活動與評量規準。",
      professional: "補強專業學習：每週整理一個 AI 教學案例，記錄成功條件與限制。",
      design: "補強 AI 系統設計：先界定問題與使用者，再畫出輸入、處理、輸出與回饋循環。"
    };
    const en = {
      human: "Strengthen human agency and accountability: after each AI use, write your judgment, risks, and final decision.",
      ethics: "Strengthen ethics and safety: practice checking privacy, bias, disclosure, and citation rules.",
      foundations: "Strengthen AI foundations: draw one diagram linking data, model, prompt, output, and checking.",
      techniques: "Strengthen AI application skills: revise prompts and verify AI answers with two sources.",
      pedagogy: "Strengthen AI pedagogy: start with learning goals, then design AI rules, activities, and criteria.",
      professional: "Strengthen professional learning: document one AI teaching case each week, including success conditions and limits.",
      design: "Strengthen AI system design: define the problem and users first, then map input, process, output, and feedback."
    };
    return (state.lang === "zh" ? zh : en)[dim.id] || (state.lang === "zh" ? "選擇一個低分面向，安排一個小任務反覆練習。" : "Choose one low-score aspect and repeat one small practice task.");
  }

  function renderFeedback() {
    const empty = qs("#feedbackEmpty");
    const content = qs("#feedbackContent");
    if (!empty || !content) return;
    if (!state.result) {
      empty.classList.remove("hidden");
      content.classList.add("hidden");
      return;
    }
    const result = state.result;
    const status = getStatus(result.total_score);
    const low = result.low_focus.length ? result.low_focus : result.dimensions.slice(0, 2);
    const recs = low.map((dim) => `<li><strong>${escapeHtml(dim.label)}:</strong> ${escapeHtml(recommendationText(dim))}</li>`).join("");
    const dimCards = result.dimensions.map((dim) => `
      <article class="dimension-card">
        <strong>${escapeHtml(dim.label)}</strong>
        <span>${dim.score}</span>
        <div class="bar"><span style="width:${dim.score}%"></span></div>
      </article>
    `).join("");
    empty.classList.add("hidden");
    content.classList.remove("hidden");
    content.innerHTML = `
      <div class="score-grid">
        <article class="score-card">
          <h3>${escapeHtml(t("scoreTitle"))}</h3>
          <div class="score-value">${result.total_score}</div>
          <span class="status-badge ${status.key}">${escapeHtml(status.label)}</span>
        </article>
        <article class="score-card">
          <h3>${escapeHtml(result.framework_label)}</h3>
          <p>${escapeHtml(state.user?.name || "")} - ${escapeHtml(state.user?.className || "")}</p>
          <p>${escapeHtml(result.completed_at)}</p>
          <p><strong>${escapeHtml(t("lowFocus"))}:</strong> ${low.map((dim) => escapeHtml(dim.label)).join(", ")}</p>
        </article>
      </div>
      <section>
        <h3>${escapeHtml(t("dimensionScores"))}</h3>
        <div class="dimension-grid">${dimCards}</div>
      </section>
      <section>
        <h3>${escapeHtml(t("recommendations"))}</h3>
        <ol class="recommendations">${recs}</ol>
      </section>
    `;
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function rankDocs(query) {
    const q = query.toLowerCase();
    const tokens = tokenize(query);
    return state.rag.map((doc) => {
      const hay = `${doc.title} ${doc.section} ${doc.zh} ${doc.en} ${(doc.keywords || []).join(" ")}`.toLowerCase();
      let score = 0;
      tokens.forEach((token) => {
        if (hay.includes(token)) score += 2;
      });
      (doc.keywords || []).forEach((keyword) => {
        if (q.includes(String(keyword).toLowerCase())) score += 5;
      });
      if (doc.framework === state.selection.framework) score += 3;
      if (doc.framework === "both") score += 1;
      return { doc, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function buildAnswer(query) {
    const ranked = rankDocs(query);
    const useful = ranked.filter((entry) => entry.score > 0);
    const picks = useful.length ? useful : ranked;
    if (state.lang === "zh") {
      const body = picks.map((entry) => `- ${entry.doc.zh}`).join("\n");
      const sources = picks.map((entry) => entry.doc.source).filter(Boolean).join("; ");
      return {
        text: `我先用目前選定的 ${labelOf(framework().label)} 來回應。\n${body}\n\n建議你下一步把問題轉成一個可觀察行為，例如「我能否說明風險、查證來源、或設計改進？」再到作答區檢核。`,
        source: `${t("sourceLabel")}: ${sources}`
      };
    }
    const body = picks.map((entry) => `- ${entry.doc.en}`).join("\n");
    const sources = picks.map((entry) => entry.doc.source).filter(Boolean).join("; ");
    return {
      text: `I will answer through the currently selected ${labelOf(framework().label)}.\n${body}\n\nNext, turn the question into observable behavior, such as whether you can explain risks, verify sources, or design improvements, then check it in the assessment area.`,
      source: `${t("sourceLabel")}: ${sources}`
    };
  }

  function addMessage(role, text, source) {
    const message = { role, text, source: source || "", time: nowIso() };
    state.messages.push(message);
    record("chats", {
      framework: state.selection.framework,
      role_in_chat: role,
      message: text,
      source
    });
    renderMessages();
  }

  function renderMessages() {
    const list = qs("#chatMessages");
    const template = qs("#messageTemplate");
    if (!list || !template) return;
    list.innerHTML = "";
    if (!state.messages.length) {
      const intro = template.content.firstElementChild.cloneNode(true);
      intro.classList.add("ai");
      intro.querySelector("strong").textContent = t("aiName");
      intro.querySelector("p").textContent = t("defaultChat");
      intro.querySelector("small").textContent = "";
      list.appendChild(intro);
      return;
    }
    state.messages.forEach((message) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.classList.add(message.role === "user" ? "user" : "ai");
      node.querySelector("strong").textContent = message.role === "user" ? t("userName") : t("aiName");
      node.querySelector("p").textContent = message.text;
      node.querySelector("small").textContent = message.source || message.time;
      list.appendChild(node);
    });
    list.scrollTop = list.scrollHeight;
  }

  function coachQuestion() {
    const current = framework();
    const dim = state.selection.dimension === "all"
      ? current.dimensions[0]
      : current.dimensions.find((item) => item.id === state.selection.dimension) || current.dimensions[0];
    const level = state.selection.level === "all"
      ? current.levels[0]
      : current.levels.find((item) => item.id === state.selection.level) || current.levels[0];
    const comp = dim.competencies[level.id];
    const text = state.lang === "zh"
      ? `請用一個最近的學習或教學情境回答：在「${labelOf(dim)} - ${labelOf(comp)}」中，你已經做到什麼？還缺哪一個證據可以證明你做到了？`
      : `Use one recent learning or teaching situation to answer: in "${labelOf(dim)} - ${labelOf(comp)}", what have you already done, and what evidence is still missing?`;
    addMessage("ai", text, `${t("sourceLabel")}: ${labelOf(framework().label)}`);
  }

  function csvEscape(value) {
    const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv(type, filename) {
    const records = getRecords()[type] || [];
    if (!records.length) {
      alert(t("noRecords"));
      return;
    }
    const headers = Array.from(records.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    const csv = [headers.join(","), ...records.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function wireEvents() {
    qs("#languageSelect").value = state.lang;
    qs("#languageSelect").addEventListener("change", (event) => {
      state.lang = event.target.value;
      applyLanguage();
    });
    qsa("[data-route]").forEach((button) => {
      button.addEventListener("click", () => setRoute(button.dataset.route));
    });
    qs("#consentNext").addEventListener("click", () => {
      if (!qs("#consentCheck").checked) {
        alert(t("consentRequired"));
        return;
      }
      record("consents", { consent_version: "2026-05-22-v1", agreed: true });
      setRoute("login");
    });
    qs("#loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const user = Object.assign(data, { login_time: nowIso() });
      saveUser(user);
      record("logins", {
        login_time: user.login_time,
        login_role: user.role,
        course_code: user.courseCode || ""
      });
      setRoute("choose");
    });
    qs("#frameworkSelect").addEventListener("change", (event) => {
      state.selection.framework = event.target.value;
      state.selection.dimension = "all";
      state.selection.level = "all";
      populateLinkedMenus();
      renderFrameworkMatrix();
    });
    qs("#dimensionSelect").addEventListener("change", (event) => {
      state.selection.dimension = event.target.value;
    });
    qs("#levelSelect").addEventListener("change", (event) => {
      state.selection.level = event.target.value;
    });
    qs("#countSelect").addEventListener("change", (event) => {
      state.selection.count = Number(event.target.value);
    });
    qs("#modeSelect").addEventListener("change", (event) => {
      state.selection.mode = event.target.value;
    });
    qs("#goChat").addEventListener("click", () => setRoute("chat"));
    qs("#startQuiz").addEventListener("click", () => {
      selectQuizItems();
      setRoute("quiz");
    });
    qs("#chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = qs("#chatInput");
      const question = input.value.trim();
      if (!question) {
        alert(t("noQuestion"));
        return;
      }
      addMessage("user", question);
      const answer = buildAnswer(question);
      addMessage("ai", answer.text, answer.source);
      input.value = "";
    });
    qs("#coachQuestion").addEventListener("click", coachQuestion);
    qs("#chatToQuiz").addEventListener("click", () => {
      selectQuizItems();
      setRoute("quiz");
    });
    qs("#questionList").addEventListener("change", (event) => {
      if (event.target.matches("input[type='radio']")) {
        const card = event.target.closest("[data-question-id]");
        state.answers[card.dataset.questionId] = Number(event.target.value);
        updateProgress();
      }
    });
    qs("#backChoose").addEventListener("click", () => setRoute("choose"));
    qs("#quizForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (Object.keys(state.answers).length < state.quizItems.length) {
        alert(t("quizMissing"));
        return;
      }
      calculateResult();
      renderFeedback();
      setRoute("feedback");
    });
    qs("#printReport").addEventListener("click", () => window.print());
    qs("#exportLoginCsv").addEventListener("click", () => exportCsv("logins", "unesco_ai_login_records.csv"));
    qs("#exportChatCsv").addEventListener("click", () => exportCsv("chats", "unesco_ai_chat_records.csv"));
    qs("#exportAssessmentCsv").addEventListener("click", () => exportCsv("assessments", "unesco_ai_assessment_records.csv"));
    qs("#clearLocalData").addEventListener("click", () => {
      if (!confirm(t("clearConfirm"))) return;
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(QUIZ_KEY);
      state.user = null;
      state.result = null;
      state.answers = {};
      state.quizItems = [];
      alert(t("cleared"));
      renderFeedback();
      setRoute("consent");
    });
  }

  async function init() {
    makeSession();
    loadUser();
    const [frameworks, rag, bank] = await Promise.all([
      fetch("data/frameworks.json").then((res) => res.json()),
      fetch("data/rag-index.json").then((res) => res.json()),
      fetch("data/assessment-bank.json").then((res) => res.json())
    ]);
    state.frameworks = frameworks;
    state.rag = rag;
    state.bank = bank;
    wireEvents();
    populateLinkedMenus();
    renderFrameworkMatrix();
    renderMessages();
    applyLanguage();
    setRoute(state.user ? "choose" : "consent");
  }

  init().catch((error) => {
    console.error(error);
    document.body.insertAdjacentHTML("afterbegin", `<div class="empty-state">App failed to load: ${escapeHtml(error.message)}</div>`);
  });
})();
