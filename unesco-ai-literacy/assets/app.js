(function () {
  "use strict";

  const STORE_KEY = "UNESCO_AI_LITERACY_RECORDS_V2";
  const USER_KEY = "UNESCO_AI_LITERACY_STUDENT_V2";
  const SESSION_KEY = "UNESCO_AI_LITERACY_SESSION_V2";
  const CONSENT_KEY = "UNESCO_AI_LITERACY_CONSENT_VERSION";
  const CONSENT_VERSION = "2026-05-22-public";

  const state = {
    lang: localStorage.getItem("UNESCO_AI_LITERACY_LANG") || "zh",
    route: "consent",
    config: { gasEndpoint: "" },
    frameworks: null,
    rag: [],
    user: null,
    messages: [],
    quiz: {
      framework: "aicfs",
      count: 10,
      items: [],
      index: 0,
      selected: null,
      locked: false,
      responses: []
    },
    result: null
  };

  const i18n = {
    zh: {
      appTitle: "UNESCO AI 素養自主評量",
      language: "語言",
      stepConsent: "同意",
      stepLogin: "登入",
      stepChat: "對話",
      stepAssessment: "評量",
      stepQuiz: "作答",
      stepFeedback: "診斷",
      consentStep: "開始前",
      consentTitle: "知情同意",
      consentP1: "這個網站會陪你學習 UNESCO AI 素養。你可以先和 AI 學習夥伴對話，再由 AI 依 AICFT 或 AICFS 自動出題，完成後系統會批改答案並診斷你的學習弱點。",
      consentP2: "為了產生回饋，系統會記錄你的登入資料、對話內容、測驗選擇、作答結果、分數與診斷建議。資料只用於本次學習與教師協助，不作為排名或高風險決定。",
      consentP3: "請不要輸入身分證字號、電話、住址、密碼或其他敏感個人資料。若你不同意，可以離開本頁，不會開始評量。",
      consentAgree: "我已了解並同意開始使用。",
      continue: "繼續",
      loginStep: "學生登入",
      loginTitle: "輸入基本資料",
      nameLabel: "姓名",
      studentIdLabel: "學號",
      classLabel: "班級",
      courseCodeLabel: "課堂代碼",
      loginSubmit: "登入",
      chatStep: "AI 學習夥伴",
      chatTitle: "先問問題，理解 AI 素養",
      chatPlaceholder: "你可以問：我該如何安全使用 AI？AICFS 的 AI 倫理是什麼？",
      voiceInput: "語音輸入",
      voiceListening: "聆聽中...",
      voiceNotSupported: "這個瀏覽器不支援語音輸入，請改用 Chrome 或 Edge。",
      coachQuestion: "請 AI 問我",
      sendQuestion: "送出",
      enterAssessment: "進入評量",
      connectionReady: "AI 學習夥伴會依 AICFT 與 AICFS 文件回應你的問題。",
      apiConnected: "AI API 已連線。",
      apiKeyMissing: "AI API 尚未連線：請教師確認 Apps Script 指令碼屬性 OPENAI_API_KEY。",
      apiKeyInvalid: "AI API 金鑰無法使用，請教師確認 OpenAI API key 或模型權限。",
      apiConnectionError: "AI API 連線失敗，先以內建資料回覆。",
      assessmentStep: "測驗選單",
      assessmentTitle: "選擇評量內容",
      frameworkLabel: "評量框架",
      countLabel: "測驗題數",
      startQuiz: "開始測驗",
      quizStep: "試題作答",
      quizTitle: "請選出最適合的答案",
      submitAnswer: "送出答案",
      nextQuestion: "下一題",
      feedbackStep: "診斷回饋",
      feedbackTitle: "你的 AI 素養診斷",
      downloadReport: "下載診斷 PDF",
      restart: "重新測驗",
      aiName: "AI 學習夥伴",
      userName: "我",
      welcome: "你好，先問我任何和 AI 素養有關的問題。準備好了，就按「進入評量」。",
      askMe: "請分享一個你最近使用 AI 的情境。你怎麼判斷 AI 的回答可信？",
      consentRequired: "請先勾選同意。",
      loginRequired: "請先完成登入。",
      questionRequired: "請先輸入問題。",
      answerRequired: "請先選擇一個答案。",
      loading: "正在產生回應...",
      generating: "正在產生測驗題目...",
      correct: "答對了。",
      incorrect: "這題需要再想一下。",
      score: "總分",
      accuracy: "正確率",
      statusGood: "穩定發展",
      statusWatch: "需要補強",
      statusAlert: "優先關懷",
      weakAreas: "需要優先加強",
      wrongQuestions: "需要回頭看的題目",
      aiDiagnosis: "AI 學習診斷",
      noWrong: "這次沒有答錯題目，請挑戰更多題或改選另一個框架。",
      localFallback: "目前以內建題庫繼續學習。",
      fw_aicfs: "AICFS 學生 AI 素養",
      fw_aicft: "AICFT 教師 AI 素養",
      dim_human: "以人為本心態",
      dim_ethics: "AI 倫理",
      dim_techniques: "AI 技術與應用",
      dim_design: "AI 系統設計",
      dim_foundations: "AI 基礎與應用",
      dim_pedagogy: "AI 教學法",
      dim_professional: "AI 促進專業學習",
      level_understand: "理解",
      level_apply: "應用",
      level_acquire: "建立",
      level_deepen: "深化",
      level_create: "創造"
    },
    en: {
      appTitle: "UNESCO AI Literacy Self-Assessment",
      language: "Language",
      stepConsent: "Consent",
      stepLogin: "Login",
      stepChat: "Chat",
      stepAssessment: "Assess",
      stepQuiz: "Answer",
      stepFeedback: "Feedback",
      consentStep: "Before you start",
      consentTitle: "Informed Consent",
      consentP1: "This website helps you learn UNESCO AI literacy. You may first talk with an AI learning partner, then AI will generate questions from AICFT or AICFS. After you answer, the system checks your answers and diagnoses learning weaknesses.",
      consentP2: "To provide feedback, the system records your login information, conversation, assessment choices, answers, scores, and recommendations. The data is used only for this learning activity and teacher support, not for ranking or high-stakes decisions.",
      consentP3: "Do not enter national ID numbers, phone numbers, addresses, passwords, or other sensitive personal data. If you do not agree, you may leave this page and no assessment will begin.",
      consentAgree: "I understand and agree to begin.",
      continue: "Continue",
      loginStep: "Student login",
      loginTitle: "Enter basic information",
      nameLabel: "Name",
      studentIdLabel: "Student ID",
      classLabel: "Class",
      courseCodeLabel: "Course code",
      loginSubmit: "Login",
      chatStep: "AI learning partner",
      chatTitle: "Ask first and understand AI literacy",
      chatPlaceholder: "You can ask: How can I use AI safely? What is AI ethics in AICFS?",
      voiceInput: "Voice input",
      voiceListening: "Listening...",
      voiceNotSupported: "Voice input is not supported in this browser. Please use Chrome or Edge.",
      coachQuestion: "Ask me",
      sendQuestion: "Send",
      enterAssessment: "Enter assessment",
      connectionReady: "The AI learning partner answers with reference to AICFT and AICFS.",
      apiConnected: "AI API is connected.",
      apiKeyMissing: "AI API is not connected: ask the teacher to check the Apps Script property OPENAI_API_KEY.",
      apiKeyInvalid: "The AI API key cannot be used. Ask the teacher to check the OpenAI API key or model access.",
      apiConnectionError: "AI API connection failed. Continuing with built-in learning notes.",
      assessmentStep: "Assessment menu",
      assessmentTitle: "Choose assessment content",
      frameworkLabel: "Framework",
      countLabel: "Number of questions",
      startQuiz: "Start assessment",
      quizStep: "Answer questions",
      quizTitle: "Choose the best answer",
      submitAnswer: "Submit answer",
      nextQuestion: "Next question",
      feedbackStep: "Diagnostic feedback",
      feedbackTitle: "Your AI literacy diagnosis",
      downloadReport: "Download PDF report",
      restart: "Retake",
      aiName: "AI Learning Partner",
      userName: "Me",
      welcome: "Hello. Ask me anything about AI literacy. When you are ready, press Enter assessment.",
      askMe: "Share a recent situation where you used AI. How did you decide whether the AI answer was trustworthy?",
      consentRequired: "Please agree before continuing.",
      loginRequired: "Please log in first.",
      questionRequired: "Please enter a question first.",
      answerRequired: "Please choose one answer.",
      loading: "Generating response...",
      generating: "Generating assessment questions...",
      correct: "Correct.",
      incorrect: "This one needs another look.",
      score: "Score",
      accuracy: "Accuracy",
      statusGood: "Stable growth",
      statusWatch: "Needs support",
      statusAlert: "Priority care",
      weakAreas: "Priority areas",
      wrongQuestions: "Questions to review",
      aiDiagnosis: "AI learning diagnosis",
      noWrong: "No wrong answers this time. Try more questions or another framework.",
      localFallback: "Continuing with the built-in question bank for now.",
      fw_aicfs: "AICFS Student AI Literacy",
      fw_aicft: "AICFT Teacher AI Literacy",
      dim_human: "Human-centred mindset",
      dim_ethics: "Ethics of AI",
      dim_techniques: "AI techniques and applications",
      dim_design: "AI system design",
      dim_foundations: "AI foundations and applications",
      dim_pedagogy: "AI pedagogy",
      dim_professional: "AI for professional development",
      level_understand: "Understand",
      level_apply: "Apply",
      level_acquire: "Acquire",
      level_deepen: "Deepen",
      level_create: "Create"
    },
    id: {
      appTitle: "Penilaian Mandiri Literasi AI UNESCO",
      language: "Bahasa",
      stepConsent: "Persetujuan",
      stepLogin: "Masuk",
      stepChat: "Dialog",
      stepAssessment: "Penilaian",
      stepQuiz: "Jawab",
      stepFeedback: "Diagnosis",
      consentStep: "Sebelum mulai",
      consentTitle: "Persetujuan Informasi",
      consentP1: "Situs ini membantu Anda belajar literasi AI UNESCO. Anda dapat berdialog dengan mitra belajar AI, lalu AI membuat soal berdasarkan AICFT atau AICFS. Setelah menjawab, sistem memeriksa jawaban dan mendiagnosis kelemahan belajar Anda.",
      consentP2: "Untuk memberi umpan balik, sistem mencatat data masuk, isi dialog, pilihan tes, jawaban, skor, dan saran. Data hanya digunakan untuk kegiatan belajar ini dan bantuan guru, bukan untuk peringkat atau keputusan berisiko tinggi.",
      consentP3: "Jangan memasukkan nomor identitas, telepon, alamat, kata sandi, atau data pribadi sensitif. Jika tidak setuju, Anda dapat meninggalkan halaman ini.",
      consentAgree: "Saya memahami dan setuju untuk mulai.",
      continue: "Lanjutkan",
      loginStep: "Masuk siswa",
      loginTitle: "Masukkan data dasar",
      nameLabel: "Nama",
      studentIdLabel: "Nomor siswa",
      classLabel: "Kelas",
      courseCodeLabel: "Kode kelas",
      loginSubmit: "Masuk",
      chatStep: "Mitra belajar AI",
      chatTitle: "Bertanya dahulu untuk memahami literasi AI",
      chatPlaceholder: "Anda dapat bertanya: Bagaimana menggunakan AI dengan aman? Apa etika AI dalam AICFS?",
      voiceInput: "Input suara",
      voiceListening: "Mendengarkan...",
      voiceNotSupported: "Browser ini belum mendukung input suara. Gunakan Chrome atau Edge.",
      coachQuestion: "AI bertanya",
      sendQuestion: "Kirim",
      enterAssessment: "Masuk penilaian",
      connectionReady: "Mitra belajar AI menjawab dengan rujukan AICFT dan AICFS.",
      apiConnected: "API AI tersambung.",
      apiKeyMissing: "API AI belum tersambung: minta guru memeriksa properti Apps Script OPENAI_API_KEY.",
      apiKeyInvalid: "Kunci API AI tidak dapat digunakan. Minta guru memeriksa OpenAI API key atau akses model.",
      apiConnectionError: "Koneksi API AI gagal. Belajar dilanjutkan dengan catatan bawaan.",
      assessmentStep: "Menu penilaian",
      assessmentTitle: "Pilih isi penilaian",
      frameworkLabel: "Kerangka",
      countLabel: "Jumlah soal",
      startQuiz: "Mulai tes",
      quizStep: "Menjawab soal",
      quizTitle: "Pilih jawaban terbaik",
      submitAnswer: "Kirim jawaban",
      nextQuestion: "Soal berikutnya",
      feedbackStep: "Umpan balik diagnosis",
      feedbackTitle: "Diagnosis literasi AI Anda",
      downloadReport: "Unduh laporan PDF",
      restart: "Tes ulang",
      aiName: "Mitra Belajar AI",
      userName: "Saya",
      welcome: "Halo. Tanyakan apa saja tentang literasi AI. Jika siap, tekan Masuk penilaian.",
      askMe: "Ceritakan situasi terbaru saat Anda memakai AI. Bagaimana Anda menilai jawaban AI dapat dipercaya?",
      consentRequired: "Setujui terlebih dahulu.",
      loginRequired: "Silakan masuk terlebih dahulu.",
      questionRequired: "Masukkan pertanyaan terlebih dahulu.",
      answerRequired: "Pilih satu jawaban.",
      loading: "Membuat jawaban...",
      generating: "Membuat soal penilaian...",
      correct: "Benar.",
      incorrect: "Soal ini perlu dipelajari lagi.",
      score: "Skor",
      accuracy: "Akurasi",
      statusGood: "Berkembang stabil",
      statusWatch: "Perlu dukungan",
      statusAlert: "Perlu perhatian utama",
      weakAreas: "Area prioritas",
      wrongQuestions: "Soal yang perlu ditinjau",
      aiDiagnosis: "Diagnosis belajar AI",
      noWrong: "Tidak ada jawaban salah kali ini. Coba soal lebih banyak atau kerangka lain.",
      localFallback: "Saat ini belajar dilanjutkan dengan bank soal bawaan.",
      fw_aicfs: "AICFS Literasi AI Siswa",
      fw_aicft: "AICFT Literasi AI Guru",
      dim_human: "Pola pikir berpusat pada manusia",
      dim_ethics: "Etika AI",
      dim_techniques: "Teknik dan aplikasi AI",
      dim_design: "Desain sistem AI",
      dim_foundations: "Dasar dan aplikasi AI",
      dim_pedagogy: "Pedagogi AI",
      dim_professional: "AI untuk pengembangan profesional",
      level_understand: "Memahami",
      level_apply: "Menerapkan",
      level_acquire: "Menguasai dasar",
      level_deepen: "Memperdalam",
      level_create: "Mencipta"
    },
    ss: {
      appTitle: "Kuhlola Kwakho Lwati lwe-AI lwe-UNESCO",
      language: "Lulwimi",
      stepConsent: "Imvume",
      stepLogin: "Ngena",
      stepChat: "Khuluma",
      stepAssessment: "Luhlolo",
      stepQuiz: "Phendvula",
      stepFeedback: "Kubuyeketa",
      consentStep: "Ngaphambi kwekucala",
      consentTitle: "Imvume lenelwati",
      consentP1: "Lelikhasi likusita kufundza lwati lwe-AI lwe-UNESCO. Ungakhuluma nemlingani wekufundza we-AI, bese i-AI yakha imibuto nge-AICFT noma i-AICFS. Nawucedzile, luhlelo luhlola timphendvulo bese lubona tindzawo letidzinga kusitwa.",
      consentP2: "Kute ikunike imphendvulo, luhlelo lugcina lwati lwekungena, ingcoco, kukhetsa luhlolo, timphendvulo, emamaki, kanye neteluleko. Lwati lusetjentiselwa kufundza nekusitwa nguthishela kuphela, hhayi kukala bantfu noma tincumo letinkhulu.",
      consentP3: "Ungafaki tinombolo temazisi, lucingo, likheli, liphasiwedi, noma lolunye lwati lolubucayi. Nawungavumi, ungaphuma kulelikhasi.",
      consentAgree: "Ngiyakucondza futsi ngiyavuma kucala.",
      continue: "Chubeka",
      loginStep: "Kungena kwemfundzi",
      loginTitle: "Faka lwati lwakho",
      nameLabel: "Ligama",
      studentIdLabel: "Inombolo yemfundzi",
      classLabel: "Likilasi",
      courseCodeLabel: "Ikhodi yeliklasi",
      loginSubmit: "Ngena",
      chatStep: "Umlingani wekufundza we-AI",
      chatTitle: "Buta kuqala kuze ucondze lwati lwe-AI",
      chatPlaceholder: "Ungabuta: Ngingayisebentisa njani i-AI ngekuphepha? Iyini i-AI ethics ku-AICFS?",
      voiceInput: "Faka ngelivi",
      voiceListening: "Kuyalalelwa...",
      voiceNotSupported: "Lesiphequluli asisekeli kufaka ngelivi. Sebentisa Chrome noma Edge.",
      coachQuestion: "AI ayingibute",
      sendQuestion: "Tfumela",
      enterAssessment: "Ngena eluhlolweni",
      connectionReady: "Umlingani we-AI uphendvula asebentisa AICFT ne-AICFS.",
      apiConnected: "I-AI API ixhunyiwe.",
      apiKeyMissing: "I-AI API ayikaxhunywa: cela thishela ahlole i-Apps Script property OPENAI_API_KEY.",
      apiKeyInvalid: "I-AI API key ayisebenzi. Cela thishela ahlole i-OpenAI API key noma imvume yemodeli.",
      apiConnectionError: "Kuxhumana ne-AI API kwehlulekile. Kuchubeka ngemininingwane lesesistimini.",
      assessmentStep: "Imenyu yeluhlolo",
      assessmentTitle: "Khetsa lokutohlolwa",
      frameworkLabel: "Luhlaka",
      countLabel: "Linani lemibuto",
      startQuiz: "Cala luhlolo",
      quizStep: "Phendvula imibuto",
      quizTitle: "Khetsa imphendvulo lencono",
      submitAnswer: "Tfumela imphendvulo",
      nextQuestion: "Umbuto lolandzelako",
      feedbackStep: "Kubuyeketa",
      feedbackTitle: "Kuhlolwa kwelwati lwakho lwe-AI",
      downloadReport: "Layisha umbiko we-PDF",
      restart: "Phindza luhlolo",
      aiName: "Umlingani Wekufundza we-AI",
      userName: "Mine",
      welcome: "Sawubona. Ngibute noma yini ngelwati lwe-AI. Nawulungele, cindzetela Ngena eluhlolweni.",
      askMe: "Chaza sikhatsi lowusebentise khona i-AI. Wabona njani kutsi imphendvulo ye-AI yetsembekile?",
      consentRequired: "Uyacelwa uvume kuqala.",
      loginRequired: "Uyacelwa ungene kuqala.",
      questionRequired: "Faka umbuto kuqala.",
      answerRequired: "Khetsa imphendvulo yinye.",
      loading: "Kwakhiwa imphendvulo...",
      generating: "Kwakhiwa imibuto...",
      correct: "Kuliciniso.",
      incorrect: "Lombuto udzinga kubuyeketa.",
      score: "Emamaki",
      accuracy: "Kucophelela",
      statusGood: "Kukhula kahle",
      statusWatch: "Kudzinga lusito",
      statusAlert: "Kudzinga kunakwa kakhulu",
      weakAreas: "Tindzawo tekugcila",
      wrongQuestions: "Imibuto yekubuyeketa",
      aiDiagnosis: "Kuhlolwa kwekufundza nge-AI",
      noWrong: "Akukho lokungakalungi kuloku. Yetama imibuto leminyenti noma lolunye luhlaka.",
      localFallback: "Kwamanje kufundza kuchubeka ngebhange lemibuto lelisesistimini.",
      fw_aicfs: "AICFS Lwati lwe-AI lwemfundzi",
      fw_aicft: "AICFT Lwati lwe-AI lwathishela",
      dim_human: "Kucabanga lokugxile kumuntfu",
      dim_ethics: "Imitsetfo yekutiphatsa ye-AI",
      dim_techniques: "Emasu nekusetjentiswa kwe-AI",
      dim_design: "Kwakhiwa kwesistimu ye-AI",
      dim_foundations: "Tisekelo nekusetjentiswa kwe-AI",
      dim_pedagogy: "Kufundzisa nge-AI",
      dim_professional: "AI ekutfutfukiseni umsebenti",
      level_understand: "Kucondza",
      level_apply: "Kusebentisa",
      level_acquire: "Kutfola",
      level_deepen: "Kujulisa",
      level_create: "Kwakha"
    }
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || i18n.zh[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `ai_lit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clampCount(value) {
    return Math.max(10, Math.min(30, Number(value) || 10));
  }

  function getRecords() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return {
        consents: Array.isArray(data.consents) ? data.consents : [],
        logins: Array.isArray(data.logins) ? data.logins : [],
        chats: Array.isArray(data.chats) ? data.chats : [],
        assessments: Array.isArray(data.assessments) ? data.assessments : []
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
      time: nowIso(),
      session_id: sessionId(),
      lang: state.lang
    }, state.user || {}, payload || {});
    records[type].push(entry);
    saveRecords(records);
    logRemoteRecord(type, entry);
  }

  function hasCurrentConsent() {
    return localStorage.getItem(CONSENT_KEY) === CONSENT_VERSION;
  }

  function setRoute(route) {
    if (!hasCurrentConsent() && route !== "consent") {
      if (route !== "login") alert(t("consentRequired"));
      route = "consent";
    }
    if (!state.user && !["consent", "login"].includes(route)) {
      alert(t("loginRequired"));
      route = "login";
    }
    state.route = route;
    qsa("[data-screen]").forEach((screen) => {
      screen.classList.toggle("active", screen.dataset.screen === route);
    });
    qsa("[data-step-nav]").forEach((button) => {
      button.classList.toggle("active", button.dataset.stepNav === route);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyLanguage() {
    localStorage.setItem("UNESCO_AI_LITERACY_LANG", state.lang);
    document.documentElement.lang = state.lang === "zh" ? "zh-Hant" : state.lang;
    qsa("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    qs("#chatInput").placeholder = t("chatPlaceholder");
    resetVoiceButton();
    qs("#frameworkSelect").innerHTML = `
      <option value="aicfs">${escapeHtml(t("fw_aicfs"))}</option>
      <option value="aicft">${escapeHtml(t("fw_aicft"))}</option>
    `;
    qs("#frameworkSelect").value = state.quiz.framework;
    renderMessages();
    renderQuestion();
    renderFeedback();
  }

  function frameworkName(id = state.quiz.framework) {
    return t(`fw_${id}`);
  }

  function dimensionName(id) {
    return t(`dim_${id}`);
  }

  function levelName(id) {
    return t(`level_${id}`);
  }

  function frameworkData(id = state.quiz.framework) {
    return state.frameworks?.frameworks?.[id];
  }

  function retrieveContext(query, frameworkId) {
    const q = String(query || "").toLowerCase();
    const tokens = q.split(/[^\p{Letter}\p{Number}]+/gu).filter(Boolean);
    return state.rag
      .map((doc) => {
        const hay = `${doc.title} ${doc.section} ${(doc.keywords || []).join(" ")} ${doc.zh} ${doc.en}`.toLowerCase();
        let score = doc.framework === frameworkId || doc.framework === "both" ? 4 : 0;
        tokens.forEach((token) => {
          if (hay.includes(token)) score += 2;
        });
        return { doc, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => ({
        title: entry.doc.title,
        section: entry.doc.section,
        zh: entry.doc.zh,
        en: entry.doc.en,
        source: entry.doc.source
      }));
  }

  async function postGas(action, payload) {
    const endpoint = (state.config.gasEndpoint || "").trim();
    if (!endpoint) throw new Error("missing_gas_endpoint");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({
        action,
        language: state.lang,
        session_id: sessionId(),
        student: state.user
      }, payload || {}))
    });
    if (!response.ok) throw new Error(`gas_${response.status}`);
    const json = await response.json();
    if (json && json.error) throw new Error(json.error);
    return json;
  }

  function gasErrorText(error) {
    const message = String(error && error.message ? error.message : error || "");
    if (/missing_OPENAI_API_KEY|OPENAI_API_KEY|missing_gas_endpoint/i.test(message)) return t("apiKeyMissing");
    if (/openai_401|openai_403|invalid_api_key|insufficient_quota|model/i.test(message)) return t("apiKeyInvalid");
    return t("apiConnectionError");
  }

  function logRemoteRecord(type, entry) {
    const endpoint = (state.config.gasEndpoint || "").trim();
    if (!endpoint) return;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log_event",
        record_type: type,
        language: state.lang,
        session_id: sessionId(),
        student: state.user,
        record: entry
      })
    }).catch(() => {});
  }

  function speechLanguage() {
    return {
      zh: "zh-TW",
      en: "en-US",
      id: "id-ID",
      ss: "ss-ZA"
    }[state.lang] || "zh-TW";
  }

  function speechRecognitionClass() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  function resetVoiceButton() {
    const button = qs("#voiceInput");
    if (!button) return;
    button.textContent = t("voiceInput");
    button.classList.remove("listening");
  }

  function toggleVoiceInput() {
    const SpeechRecognition = speechRecognitionClass();
    if (!SpeechRecognition) {
      alert(t("voiceNotSupported"));
      return;
    }
    if (state.voiceRecognition) {
      state.voiceRecognition.stop();
      state.voiceRecognition = null;
      resetVoiceButton();
      return;
    }

    const recognition = new SpeechRecognition();
    state.voiceRecognition = recognition;
    recognition.lang = speechLanguage();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      qs("#voiceInput").textContent = t("voiceListening");
      qs("#voiceInput").classList.add("listening");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        const input = qs("#chatInput");
        input.value = input.value ? `${input.value} ${transcript}` : transcript;
        input.focus();
      }
    };
    recognition.onerror = () => {
      qs("#connectionNote").textContent = t("voiceNotSupported");
    };
    recognition.onend = () => {
      state.voiceRecognition = null;
      resetVoiceButton();
    };
    recognition.start();
  }

  function localChatAnswer(question) {
    const context = retrieveContext(question, "aicfs").concat(retrieveContext(question, "aicft")).slice(0, 3);
    const joined = context.map((item) => state.lang === "zh" ? item.zh : item.en).join("\n");
    const prefix = {
      zh: "我會用 UNESCO AICFT 與 AICFS 的重點陪你理解：",
      en: "I will answer using the key ideas from UNESCO AICFT and AICFS:",
      id: "Saya akan menjawab dengan gagasan utama UNESCO AICFT dan AICFS:",
      ss: "Ngitawuphendvula ngemicondvo lebalulekile ye-UNESCO AICFT ne-AICFS:"
    }[state.lang] || i18n.en.welcome;
    return `${prefix}\n${joined || t("welcome")}`;
  }

  function addMessage(role, text, source) {
    const message = { role, text, source: source || "", time: nowIso() };
    state.messages.push(message);
    record("chats", {
      chat_role: role,
      message: text,
      source: source || ""
    });
    renderMessages();
  }

  function renderMessages() {
    const list = qs("#chatMessages");
    const template = qs("#messageTemplate");
    if (!list || !template) return;
    list.innerHTML = "";
    const messages = state.messages.length
      ? state.messages
      : [{ role: "ai", text: t("welcome"), source: "" }];
    messages.forEach((message) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.classList.add(message.role === "user" ? "user" : "ai");
      node.querySelector("strong").textContent = message.role === "user" ? t("userName") : t("aiName");
      node.querySelector("p").textContent = message.text;
      node.querySelector("small").textContent = message.source || "";
      list.appendChild(node);
    });
    list.scrollTop = list.scrollHeight;
  }

  function itemTemplates() {
    return {
      zh: {
        stem: "在「{dim}」的「{level}」層級中，下列哪一項最符合負責任的 AI 素養？",
        correct: "先確認目標、風險與人的判斷，再使用 AI 協助完成任務。",
        distractors: [
          "只要 AI 回答很快，就直接把內容當成正確答案。",
          "把個人或同學的敏感資料貼給 AI，換取更完整的回答。",
          "讓 AI 完成所有思考，自己只負責複製結果。"
        ],
        explanation: "AI 素養重視人的判斷、倫理、安全與反思。"
      },
      en: {
        stem: "For the \"{dim}\" aspect at the \"{level}\" level, which action best shows responsible AI literacy?",
        correct: "Clarify the goal, risks, and human judgment before using AI to support the task.",
        distractors: [
          "Treat any fast AI answer as correct.",
          "Paste sensitive personal or classmate data into AI to get a fuller answer.",
          "Let AI do all the thinking while you only copy the result."
        ],
        explanation: "AI literacy values human judgment, ethics, safety, and reflection."
      },
      id: {
        stem: "Untuk aspek \"{dim}\" pada tingkat \"{level}\", tindakan mana yang paling menunjukkan literasi AI yang bertanggung jawab?",
        correct: "Menjelaskan tujuan, risiko, dan penilaian manusia sebelum memakai AI untuk membantu tugas.",
        distractors: [
          "Menganggap semua jawaban AI yang cepat pasti benar.",
          "Memasukkan data pribadi sensitif ke AI agar jawaban lebih lengkap.",
          "Membiarkan AI melakukan semua pemikiran dan hanya menyalin hasilnya."
        ],
        explanation: "Literasi AI menekankan penilaian manusia, etika, keamanan, dan refleksi."
      },
      ss: {
        stem: "Ku \"{dim}\" esigabeni se \"{level}\", ngusiphi sento lesikhombisa lwati lwe-AI lolunesibopho?",
        correct: "Cacisa umgomo, tingoti, nekwehlulela kwemuntfu ngaphambi kwekusebentisa i-AI kusita umsebenzi.",
        distractors: [
          "Kutsatsa yonkhe imphendvulo ye-AI lesheshako njengeliciniso.",
          "Kufaka imininingwane lemfihlo ku-AI kute uthole imphendvulo lenabile.",
          "Kuvumela i-AI icabange konkhe wena ukopishe umphumela kuphela."
        ],
        explanation: "Lwati lwe-AI lugcizelela kwehlulela kwemuntfu, kutiphatsa, kuphepha nekucabangisisa."
      }
    };
  }

  function buildLocalItems(frameworkId, count) {
    const fw = frameworkData(frameworkId);
    const template = itemTemplates()[state.lang] || itemTemplates().en;
    const dims = fw.dimensions;
    const levels = fw.levels;
    const pool = [];
    dims.forEach((dim) => {
      levels.forEach((level) => {
        for (let variant = 0; variant < 3; variant += 1) {
          const id = `${frameworkId}_${dim.id}_${level.id}_${variant + 1}`;
          const stem = template.stem
            .replace("{dim}", dimensionName(dim.id))
            .replace("{level}", levelName(level.id));
          const distractors = template.distractors.slice();
          const rotation = Math.abs(hashString(id)) % 4;
          const options = [template.correct, ...distractors];
          const correctText = options[0];
          const ordered = options.slice(rotation).concat(options.slice(0, rotation));
          pool.push({
            id,
            framework: frameworkId,
            dimension: dim.id,
            level: level.id,
            question: stem,
            options: ordered,
            answerIndex: ordered.indexOf(correctText),
            explanation: template.explanation
          });
        }
      });
    });
    return shuffle(pool, `${frameworkId}_${state.user?.account || ""}_${new Date().toISOString().slice(0, 10)}`).slice(0, count);
  }

  function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function shuffle(items, seed) {
    return items
      .map((item) => ({ item, key: hashString(`${seed}_${item.id}`) }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.item);
  }

  function normalizeItems(items, frameworkId, count) {
    if (!Array.isArray(items)) return [];
    const cleaned = items.map((item, index) => {
      const options = Array.isArray(item.options) ? item.options.map(String).filter(Boolean).slice(0, 4) : [];
      if (options.length < 4) return null;
      const answerIndex = Number.isInteger(item.answerIndex) ? item.answerIndex : Number(item.answer_index);
      if (answerIndex < 0 || answerIndex > 3) return null;
      return {
        id: String(item.id || `ai_${index + 1}`),
        framework: frameworkId,
        dimension: String(item.dimension || "human"),
        level: String(item.level || ""),
        question: String(item.question || item.stem || ""),
        options,
        answerIndex,
        explanation: String(item.explanation || "")
      };
    }).filter((item) => item && item.question);
    return cleaned.slice(0, count);
  }

  async function generateItems(frameworkId, count) {
    const context = retrieveContext(frameworkId, frameworkId);
    try {
      const json = await postGas("generate_items", {
        framework: frameworkId,
        framework_label: frameworkName(frameworkId),
        count,
        context
      });
      const items = normalizeItems(json.items || json.data?.items, frameworkId, count);
      if (items.length >= count) return items;
      throw new Error("not_enough_items");
    } catch (error) {
      qs("#connectionNote").textContent = t("localFallback");
      return buildLocalItems(frameworkId, count);
    }
  }

  function renderQuestion() {
    const item = state.quiz.items[state.quiz.index];
    if (!item || state.route !== "quiz") return;
    const total = state.quiz.items.length;
    const current = state.quiz.index + 1;
    qs("#progressText").textContent = `${current}/${total}`;
    qs("#progressBar").style.width = `${Math.round((state.quiz.index / total) * 100)}%`;
    qs("#questionMeta").innerHTML = `
      <span class="tag">Q${current}</span>
      <span class="tag">${escapeHtml(frameworkName(item.framework))}</span>
      <span class="tag">${escapeHtml(dimensionName(item.dimension))}</span>
    `;
    qs("#questionStem").textContent = item.question;
    qs("#answerFeedback").textContent = "";
    qs("#submitAnswer").disabled = false;
    qs("#nextQuestion").disabled = true;
    state.quiz.selected = null;
    state.quiz.locked = false;
    qs("#optionList").innerHTML = item.options.map((option, index) => `
      <button type="button" class="option-btn" data-option="${index}">
        ${String.fromCharCode(65 + index)}. ${escapeHtml(option)}
      </button>
    `).join("");
  }

  function selectOption(button) {
    if (state.quiz.locked) return;
    qsa(".option-btn").forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    state.quiz.selected = Number(button.dataset.option);
  }

  function submitAnswer() {
    const item = state.quiz.items[state.quiz.index];
    if (state.quiz.selected === null) {
      alert(t("answerRequired"));
      return;
    }
    state.quiz.locked = true;
    const correct = state.quiz.selected === item.answerIndex;
    qsa(".option-btn").forEach((btn) => {
      const option = Number(btn.dataset.option);
      btn.classList.toggle("correct", option === item.answerIndex);
      btn.classList.toggle("wrong", option === state.quiz.selected && !correct);
    });
    qs("#answerFeedback").textContent = `${correct ? t("correct") : t("incorrect")} ${item.explanation || ""}`;
    qs("#submitAnswer").disabled = true;
    qs("#nextQuestion").disabled = false;
    state.quiz.responses.push({
      id: item.id,
      framework: item.framework,
      dimension: item.dimension,
      level: item.level,
      question: item.question,
      selected: state.quiz.selected,
      selectedText: item.options[state.quiz.selected],
      answerIndex: item.answerIndex,
      answerText: item.options[item.answerIndex],
      correct,
      explanation: item.explanation
    });
  }

  function nextQuestion() {
    if (state.quiz.index < state.quiz.items.length - 1) {
      state.quiz.index += 1;
      renderQuestion();
      return;
    }
    finishAssessment();
  }

  function statusFor(score) {
    if (score >= 80) return { key: "good", label: t("statusGood") };
    if (score >= 60) return { key: "watch", label: t("statusWatch") };
    return { key: "alert", label: t("statusAlert") };
  }

  async function finishAssessment() {
    const responses = state.quiz.responses;
    const correctCount = responses.filter((item) => item.correct).length;
    const total = responses.length;
    const score = Math.round((correctCount / total) * 100);
    const byDim = {};
    responses.forEach((item) => {
      byDim[item.dimension] ||= { total: 0, correct: 0 };
      byDim[item.dimension].total += 1;
      if (item.correct) byDim[item.dimension].correct += 1;
    });
    const dimensions = Object.entries(byDim).map(([id, data]) => ({
      id,
      label: dimensionName(id),
      score: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total
    })).sort((a, b) => a.score - b.score);
    const wrong = responses.filter((item) => !item.correct);
    const result = {
      framework: state.quiz.framework,
      frameworkLabel: frameworkName(state.quiz.framework),
      score,
      correctCount,
      total,
      status: statusFor(score),
      dimensions,
      wrong,
      diagnosis: localDiagnosis(score, dimensions, wrong),
      completedAt: nowIso()
    };
    state.result = result;
    setRoute("feedback");
    renderFeedback();
    try {
      const json = await postGas("diagnose", {
        framework: result.framework,
        score: result.score,
        dimensions: result.dimensions,
        wrong: result.wrong.slice(0, 8)
      });
      if (json.diagnosis) {
        state.result.diagnosis = String(json.diagnosis);
        renderFeedback();
      }
    } catch (_) {
      // Local diagnosis is already shown.
    }
    record("assessments", {
      framework: result.framework,
      question_count: result.total,
      correct_count: result.correctCount,
      score: result.score,
      status: result.status.label,
      dimensions_json: JSON.stringify(result.dimensions),
      wrong_json: JSON.stringify(result.wrong),
      diagnosis: state.result.diagnosis
    });
  }

  function localDiagnosis(score, dimensions, wrong) {
    const weakest = dimensions.slice(0, 2).map((dim) => dim.label).join(", ");
    if (state.lang === "zh") return `你的總分是 ${score}。優先加強：${weakest || "持續深化"}。建議重新閱讀答錯題的說明，再用自己的例子向 AI 學習夥伴追問一次。`;
    if (state.lang === "id") return `Skor Anda ${score}. Area prioritas: ${weakest || "lanjutkan penguatan"}. Pelajari penjelasan soal yang salah, lalu tanyakan kembali dengan contoh Anda sendiri.`;
    if (state.lang === "ss") return `Emamaki akho ngu ${score}. Gcila ku: ${weakest || "kuchubeka nekutfutfuka"}. Fundza inchazelo yemibuto lengakalungi, bese ubuta i-AI ngesibonelo sakho.`;
    return `Your score is ${score}. Priority areas: ${weakest || "continued growth"}. Review the explanations for missed questions, then ask the AI learning partner again using your own example.`;
  }

  function renderFeedback() {
    if (!state.result || state.route !== "feedback") return;
    const result = state.result;
    qs("#reportDate").textContent = new Date(result.completedAt).toLocaleString();
    const dimRows = result.dimensions.map((dim) => `
      <div class="dimension-row">
        <span>${escapeHtml(dim.label)}</span>
        <div class="bar"><span style="width:${dim.score}%"></span></div>
        <b>${dim.score}</b>
      </div>
    `).join("");
    const wrongList = result.wrong.length
      ? result.wrong.map((item, index) => `
        <div class="wrong-item">
          <b>${index + 1}. ${escapeHtml(item.question)}</b>
          <p>${escapeHtml(item.explanation || "")}</p>
        </div>
      `).join("")
      : `<p>${escapeHtml(t("noWrong"))}</p>`;
    qs("#feedbackContent").innerHTML = `
      <div class="result-summary">
        <section class="score-box">
          <p class="step-label">${escapeHtml(t("score"))}</p>
          <div class="score-number">${result.score}</div>
          <span class="status ${result.status.key}">${escapeHtml(result.status.label)}</span>
        </section>
        <section class="score-box">
          <p><b>${escapeHtml(result.frameworkLabel)}</b></p>
          <p>${escapeHtml(state.user?.name || "")} ${escapeHtml(state.user?.className || "")}</p>
          <p>${escapeHtml(t("accuracy"))}: ${result.correctCount}/${result.total}</p>
          <div class="dimension-list">${dimRows}</div>
        </section>
      </div>
      <section class="weakness-box">
        <h2>${escapeHtml(t("wrongQuestions"))}</h2>
        <div class="wrong-list">${wrongList}</div>
      </section>
      <section class="diagnosis-box">
        <h2>${escapeHtml(t("aiDiagnosis"))}</h2>
        <p class="diagnosis-text">${escapeHtml(result.diagnosis)}</p>
      </section>
    `;
  }

  async function sendChat(question) {
    addMessage("user", question);
    addMessage("ai", t("loading"));
    const loadingMessage = state.messages[state.messages.length - 1];
    try {
      const context = retrieveContext(question, "both");
      const json = await postGas("chat", { question, context, history: state.messages.slice(-8) });
      loadingMessage.text = String(json.answer || json.message || localChatAnswer(question));
      loadingMessage.source = "AICFT / AICFS";
      qs("#connectionNote").textContent = t("apiConnected");
    } catch (error) {
      const problem = gasErrorText(error);
      loadingMessage.text = localChatAnswer(question);
      loadingMessage.source = problem;
      qs("#connectionNote").textContent = problem;
    }
    renderMessages();
  }

  function downloadReport() {
    const area = qs("#reportArea");
    if (window.html2pdf) {
      window.html2pdf().set({
        margin: 10,
        filename: "UNESCO_AI_literacy_diagnosis.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      }).from(area).save();
      return;
    }
    window.print();
  }

  function wireEvents() {
    qs("#languageSelect").value = state.lang;
    qs("#languageSelect").addEventListener("change", (event) => {
      state.lang = event.target.value;
      applyLanguage();
    });
    qsa("[data-step-nav]").forEach((button) => {
      button.addEventListener("click", () => setRoute(button.dataset.stepNav));
    });
    qs("#consentNext").addEventListener("click", () => {
      if (!qs("#consentCheck").checked) {
        alert(t("consentRequired"));
        return;
      }
      localStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
      record("consents", { agreed: true, consent_version: CONSENT_VERSION });
      setRoute("login");
    });
    qs("#loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.user = Object.assign(Object.fromEntries(new FormData(event.currentTarget).entries()), {
        role: "student",
        login_time: nowIso()
      });
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      record("logins", { event: "login" });
      setRoute("chat");
    });
    qs("#chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = qs("#chatInput");
      const question = input.value.trim();
      if (!question) {
        alert(t("questionRequired"));
        return;
      }
      input.value = "";
      sendChat(question);
    });
    qs("#chatInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        qs("#chatForm").requestSubmit();
      }
    });
    qs("#voiceInput").addEventListener("click", toggleVoiceInput);
    qs("#coachQuestion").addEventListener("click", () => {
      addMessage("ai", t("askMe"), "AICFT / AICFS");
    });
    qs("#chatToAssessment").addEventListener("click", () => setRoute("assessment"));
    qs("#frameworkSelect").addEventListener("change", (event) => {
      state.quiz.framework = event.target.value;
    });
    qs("#countInput").addEventListener("input", (event) => {
      state.quiz.count = clampCount(event.target.value);
    });
    qs("#countMinus").addEventListener("click", () => {
      state.quiz.count = clampCount(Number(qs("#countInput").value) - 1);
      qs("#countInput").value = state.quiz.count;
    });
    qs("#countPlus").addEventListener("click", () => {
      state.quiz.count = clampCount(Number(qs("#countInput").value) + 1);
      qs("#countInput").value = state.quiz.count;
    });
    qs("#startQuiz").addEventListener("click", async () => {
      state.quiz.framework = qs("#frameworkSelect").value;
      state.quiz.count = clampCount(qs("#countInput").value);
      qs("#startQuiz").disabled = true;
      qs("#startQuiz").textContent = t("generating");
      state.quiz.items = await generateItems(state.quiz.framework, state.quiz.count);
      state.quiz.index = 0;
      state.quiz.responses = [];
      qs("#startQuiz").disabled = false;
      qs("#startQuiz").textContent = t("startQuiz");
      setRoute("quiz");
      renderQuestion();
    });
    qs("#optionList").addEventListener("click", (event) => {
      const button = event.target.closest(".option-btn");
      if (button) selectOption(button);
    });
    qs("#submitAnswer").addEventListener("click", submitAnswer);
    qs("#nextQuestion").addEventListener("click", nextQuestion);
    qs("#downloadReport").addEventListener("click", downloadReport);
    qs("#restartAssessment").addEventListener("click", () => {
      state.result = null;
      setRoute("assessment");
    });
  }

  async function init() {
    sessionId();
    try {
      state.user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (_) {
      state.user = null;
    }
    const [frameworks, rag, config] = await Promise.all([
      fetch("data/frameworks.json").then((res) => res.json()),
      fetch("data/rag-index.json").then((res) => res.json()),
      fetch("data/site-config.json").then((res) => res.json()).catch(() => ({}))
    ]);
    state.frameworks = frameworks;
    state.rag = rag;
    state.config = Object.assign({}, state.config, config);
    wireEvents();
    applyLanguage();
    setRoute(state.user && hasCurrentConsent() ? "chat" : "consent");
  }

  init().catch((error) => {
    console.error(error);
    document.body.insertAdjacentHTML("afterbegin", `<p>${escapeHtml(error.message)}</p>`);
  });
})();
