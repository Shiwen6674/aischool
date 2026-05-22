(function() {
  "use strict";

  if (window.AISchoolMembership) return;

  const FREE_DAILY_SECONDS = 10 * 60;
  const IDLE_SECONDS = 20 * 60;
  const PAID_DAILY_QUOTA_TWD = 15;
  const PAID_HOURLY_QUOTA_TWD = 2;
  const STORAGE_PREFIX = "AISCHOOL_MEMBERSHIP_V1";
  const EXEMPT_EMAILS = new Set([
    "student@gmail.com",
    "teacher@gmail.com",
    "researcher@gmail.com"
  ]);
  const METERED_ENDPOINT_KEYS = new Set([
    "cloudTts",
    "studentAdaptiveTesting",
    "studentUnitCoreIdea",
    "studentBilingualTracking",
    "teacherItemVocabulary",
    "teacherCatReview",
    "professorSegmentation",
    "professorSfl",
    "professorScienceQuery",
    "professorReadability",
    "professorTextSimilarity",
    "professorWordcloud"
  ]);
  const COST_BY_ENDPOINT_KEY = {
    cloudTts: 0.05,
    studentBilingualTracking: 0.03,
    studentAdaptiveTesting: 0.65,
    studentUnitCoreIdea: 0.75,
    teacherItemVocabulary: 0.75,
    teacherCatReview: 0.75,
    professorSegmentation: 0.6,
    professorSfl: 0.85,
    professorScienceQuery: 0.85,
    professorReadability: 0.65,
    professorTextSimilarity: 0.75,
    professorWordcloud: 0.55
  };

  let freeTimer = null;
  let idleTimer = null;
  let quotaRefreshTimer = null;
  let lastActivityMs = Date.now();
  let notices = {};
  let remoteStatus = null;
  let originalFetch = window.fetch ? window.fetch.bind(window) : null;
  let fetchPatched = false;

  function getUser() {
    return window.AISchool && typeof window.AISchool.getCurrentUser === "function"
      ? window.AISchool.getCurrentUser()
      : null;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function isTruthy(value) {
    return value === true || ["true", "1", "yes", "y"].includes(String(value || "").trim().toLowerCase());
  }

  function isExempt(user) {
    const email = normalizeEmail(user && user.email);
    return Boolean(user && (EXEMPT_EMAILS.has(email) || isTruthy(user.admin) || user.role === "admin"));
  }

  function taipeiParts(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date || new Date());
    const bag = {};
    parts.forEach((part) => { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag;
  }

  function taipeiDateKey(date) {
    const p = taipeiParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function taipeiHourKey(date) {
    const p = taipeiParts(date);
    return `${p.year}-${p.month}-${p.day}-${p.hour}`;
  }

  function safeJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storageKey(kind, user) {
    const email = normalizeEmail(user && user.email) || "anonymous";
    return `${STORAGE_PREFIX}:${kind}:${email}`;
  }

  function readDailyUsage(user) {
    const today = taipeiDateKey();
    const data = safeJson(localStorage.getItem(storageKey("daily", user)), null);
    if (!data || data.date !== today) return { date: today, freeSeconds: 0, costTwd: 0 };
    return {
      date: today,
      freeSeconds: Number(data.freeSeconds || 0) || 0,
      costTwd: Number(data.costTwd || 0) || 0
    };
  }

  function writeDailyUsage(user, usage) {
    localStorage.setItem(storageKey("daily", user), JSON.stringify({
      date: taipeiDateKey(),
      freeSeconds: Math.max(0, Number(usage.freeSeconds || 0) || 0),
      costTwd: roundCost(usage.costTwd)
    }));
  }

  function readHourlyUsage(user) {
    const hour = taipeiHourKey();
    const data = safeJson(localStorage.getItem(storageKey("hourly", user)), null);
    if (!data || data.hour !== hour) return { hour, costTwd: 0 };
    return {
      hour,
      costTwd: Number(data.costTwd || 0) || 0
    };
  }

  function writeHourlyUsage(user, usage) {
    localStorage.setItem(storageKey("hourly", user), JSON.stringify({
      hour: taipeiHourKey(),
      costTwd: roundCost(usage.costTwd)
    }));
  }

  function roundCost(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function parsePlanStatus(user) {
    const plan = String(
      remoteStatus?.membershipPlan ||
      user?.membershipPlan ||
      user?.plan ||
      ""
    ).trim().toLowerCase();
    const status = String(
      remoteStatus?.membershipStatus ||
      user?.membershipStatus ||
      user?.status ||
      ""
    ).trim().toLowerCase();
    const expires = String(
      remoteStatus?.membershipExpiresAt ||
      user?.membershipExpiresAt ||
      user?.membershipUntil ||
      ""
    ).trim();
    const untilMs = expires ? Date.parse(expires.replace(/\//g, "-")) : NaN;
    const isActiveWord = ["active", "paid", "sponsored", "subscription", "subscribed", "week", "weekly", "month", "monthly", "週訂制", "月訂制", "有效"].some((word) => {
      return plan.includes(word) || status.includes(word);
    });
    const isFuture = Number.isFinite(untilMs) && untilMs > Date.now();
    const paid = isActiveWord && (!expires || isFuture);
    const normalizedPlan = plan.includes("month") || plan.includes("月") ? "monthly" : (plan.includes("week") || plan.includes("週") ? "weekly" : (paid ? "sponsored" : "free"));
    return { paid, plan: normalizedPlan, status, expires, untilMs: Number.isFinite(untilMs) ? untilMs : null };
  }

  function getTier(user) {
    if (!user) return { kind: "guest", label: "未登入", paid: false, unlimited: false };
    if (isExempt(user)) return { kind: "unlimited", label: "不限額帳號", paid: true, unlimited: true };
    const parsed = parsePlanStatus(user);
    if (parsed.paid) {
      return {
        kind: parsed.plan,
        label: parsed.plan === "monthly" ? "月訂制" : (parsed.plan === "weekly" ? "週訂制" : "贊助方案"),
        paid: true,
        unlimited: false,
        expires: parsed.expires
      };
    }
    return { kind: "free", label: "免費體驗", paid: false, unlimited: false };
  }

  function ensureStyles() {
    if (document.getElementById("aischool-membership-styles")) return;
    const style = document.createElement("style");
    style.id = "aischool-membership-styles";
    style.textContent = `
      .ais-membership-widget {
        position: fixed;
        right: 1.15rem;
        bottom: 1.15rem;
        z-index: 80;
        width: min(22rem, calc(100vw - 2rem));
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 1.3rem;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.76));
        color: #e2e8f0;
        box-shadow: 0 24px 60px rgba(2, 6, 23, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        overflow: hidden;
        font-family: "Noto Sans TC", "Outfit", system-ui, sans-serif;
      }
      .ais-membership-widget.is-hidden { display: none; }
      .ais-membership-widget.is-collapsed .ais-membership-body { display: none; }
      .ais-membership-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 0.85rem 0.95rem;
      }
      .ais-membership-brand {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-width: 0;
      }
      .ais-membership-brand i {
        color: #22d3ee;
        filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.5));
      }
      .ais-membership-title {
        display: block;
        font-size: 0.82rem;
        font-weight: 900;
        line-height: 1.1;
        color: #f8fafc;
      }
      .ais-membership-subtitle {
        display: block;
        margin-top: 0.18rem;
        font-size: 0.68rem;
        font-weight: 800;
        color: #94a3b8;
      }
      .ais-membership-toggle {
        display: inline-flex;
        width: 2.1rem;
        height: 2.1rem;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.48);
        color: #bae6fd;
        cursor: pointer;
      }
      .ais-membership-body {
        padding: 0 0.95rem 0.95rem;
      }
      .ais-quota-row {
        margin-top: 0.7rem;
      }
      .ais-quota-row label {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        font-weight: 900;
        color: #cbd5e1;
        margin-bottom: 0.35rem;
      }
      .ais-quota-track {
        height: 0.5rem;
        border-radius: 999px;
        background: rgba(30, 41, 59, 0.88);
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .ais-quota-fill {
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: linear-gradient(90deg, #22c55e, #22d3ee);
        transition: width 0.24s ease, background 0.24s ease;
      }
      .ais-quota-fill.warn { background: linear-gradient(90deg, #f59e0b, #f97316); }
      .ais-quota-fill.danger { background: linear-gradient(90deg, #ef4444, #f97316); }
      .ais-membership-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.85rem;
      }
      .ais-membership-actions button,
      .ais-membership-actions a {
        flex: 1 1 auto;
        min-width: 6.2rem;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 0.9rem;
        padding: 0.62rem 0.75rem;
        background: rgba(30, 41, 59, 0.76);
        color: #e0f2fe;
        font-size: 0.76rem;
        font-weight: 900;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
      }
      .ais-membership-actions .primary {
        background: linear-gradient(135deg, #2563eb, #14b8a6);
        border-color: rgba(34, 211, 238, 0.32);
        color: white;
        box-shadow: 0 14px 32px rgba(20, 184, 166, 0.24);
      }
      .ais-membership-toast {
        position: fixed;
        left: 50%;
        bottom: 2rem;
        transform: translateX(-50%);
        z-index: 120;
        width: min(38rem, calc(100vw - 2rem));
        border-radius: 1.1rem;
        padding: 1rem 1.15rem;
        color: #f8fafc;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
        border: 1px solid rgba(56, 189, 248, 0.28);
        box-shadow: 0 24px 70px rgba(2, 6, 23, 0.48);
        font-weight: 900;
        backdrop-filter: blur(18px);
      }
      .ais-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(2, 6, 23, 0.68);
        backdrop-filter: blur(14px);
      }
      .ais-modal {
        width: min(42rem, 100%);
        max-height: min(90vh, 46rem);
        overflow: auto;
        border-radius: 1.4rem;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.94));
        color: #e5e7eb;
        box-shadow: 0 32px 90px rgba(2, 6, 23, 0.5);
      }
      .ais-modal header,
      .ais-modal footer {
        padding: 1.2rem 1.35rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      }
      .ais-modal footer {
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        border-bottom: 0;
        display: flex;
        justify-content: flex-end;
        gap: 0.7rem;
      }
      .ais-modal h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 950;
        color: #f8fafc;
      }
      .ais-modal .ais-modal-body {
        padding: 1.35rem;
      }
      .ais-modal textarea,
      .ais-modal input {
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.26);
        border-radius: 0.95rem;
        padding: 0.85rem 0.95rem;
        color: #e2e8f0;
        background: rgba(15, 23, 42, 0.72);
        outline: none;
      }
      .ais-modal button {
        border: 0;
        border-radius: 0.95rem;
        padding: 0.78rem 1rem;
        font-weight: 950;
        cursor: pointer;
      }
      .ais-modal .secondary {
        background: rgba(51, 65, 85, 0.9);
        color: #e2e8f0;
      }
      .ais-modal .primary {
        color: white;
        background: linear-gradient(135deg, #2563eb, #14b8a6);
      }
      .ais-rating {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0.55rem;
        margin: 1rem 0;
      }
      .ais-rating button {
        background: rgba(30, 41, 59, 0.86);
        color: #bae6fd;
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
      .ais-rating button.is-selected {
        background: linear-gradient(135deg, #f59e0b, #22c55e);
        color: #0f172a;
      }
      @media (max-width: 760px) {
        .ais-membership-widget {
          left: 0.75rem;
          right: 0.75rem;
          bottom: 0.75rem;
          width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureWidget() {
    ensureStyles();
    let widget = document.getElementById("ais-membership-widget");
    if (widget) return widget;
    widget = document.createElement("aside");
    widget.id = "ais-membership-widget";
    widget.className = "ais-membership-widget is-hidden";
    widget.innerHTML = `
      <div class="ais-membership-top">
        <div class="ais-membership-brand">
          <i class="fa-solid fa-gauge-high"></i>
          <div>
            <span class="ais-membership-title" data-role="title">AI 額度</span>
            <span class="ais-membership-subtitle" data-role="subtitle">讀取中</span>
          </div>
        </div>
        <button class="ais-membership-toggle" type="button" aria-label="切換額度面板"><i class="fa-solid fa-chevron-down"></i></button>
      </div>
      <div class="ais-membership-body">
        <div class="ais-quota-row" data-role="free-row">
          <label><span>今日免費體驗</span><strong data-role="free-text">0%</strong></label>
          <div class="ais-quota-track"><div class="ais-quota-fill" data-role="free-fill"></div></div>
        </div>
        <div class="ais-quota-row" data-role="hour-row">
          <label><span>本小時 AI 用額</span><strong data-role="hour-text">0%</strong></label>
          <div class="ais-quota-track"><div class="ais-quota-fill" data-role="hour-fill"></div></div>
        </div>
        <div class="ais-quota-row" data-role="day-row">
          <label><span>今日 AI 用額</span><strong data-role="day-text">0%</strong></label>
          <div class="ais-quota-track"><div class="ais-quota-fill" data-role="day-fill"></div></div>
        </div>
        <div class="ais-membership-actions">
          <a href="account_settings.html">帳戶與額度</a>
          <button class="primary" type="button" data-plan="weekly">週訂制 NT$150</button>
          <button class="primary" type="button" data-plan="monthly">月訂制 NT$500</button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
    widget.querySelector(".ais-membership-toggle").addEventListener("click", () => {
      widget.classList.toggle("is-collapsed");
    });
    widget.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => startEcpayCheckout(btn.getAttribute("data-plan")));
    });
    return widget;
  }

  function setFillState(fill, percent) {
    if (!fill) return;
    const pct = Math.max(0, Math.min(100, percent));
    fill.style.width = `${pct}%`;
    fill.classList.toggle("warn", pct >= 80 && pct < 95);
    fill.classList.toggle("danger", pct >= 95);
  }

  function formatPercent(used, max) {
    if (!max) return "--";
    return `${Math.min(100, Math.round((used / max) * 100))}%`;
  }

  function formatSecondsLeft(seconds) {
    const left = Math.max(0, Math.ceil(seconds));
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function renderWidget() {
    const user = getUser();
    const widget = ensureWidget();
    if (!user) {
      widget.classList.add("is-hidden");
      return;
    }
    widget.classList.remove("is-hidden");

    const tier = getTier(user);
    const daily = readDailyUsage(user);
    const hourly = readHourlyUsage(user);
    const remoteDaily = Number(remoteStatus?.dailyUsedTwd || user.dailyUsedTwd || 0) || 0;
    const remoteHourly = Number(remoteStatus?.hourlyUsedTwd || user.hourlyUsedTwd || 0) || 0;
    const dailyCost = Math.max(Number(daily.costTwd || 0) || 0, remoteDaily);
    const hourlyCost = Math.max(Number(hourly.costTwd || 0) || 0, remoteHourly);
    const title = widget.querySelector("[data-role='title']");
    const subtitle = widget.querySelector("[data-role='subtitle']");
    const freeRow = widget.querySelector("[data-role='free-row']");
    const hourRow = widget.querySelector("[data-role='hour-row']");
    const dayRow = widget.querySelector("[data-role='day-row']");
    const freeFill = widget.querySelector("[data-role='free-fill']");
    const hourFill = widget.querySelector("[data-role='hour-fill']");
    const dayFill = widget.querySelector("[data-role='day-fill']");
    const freeText = widget.querySelector("[data-role='free-text']");
    const hourText = widget.querySelector("[data-role='hour-text']");
    const dayText = widget.querySelector("[data-role='day-text']");

    title.textContent = tier.unlimited ? "AI 額度：不限額" : `AI 額度：${tier.label}`;
    subtitle.textContent = tier.expires ? `有效至 ${tier.expires}` : (tier.paid ? "自然科 6 個模組可用" : "每日免費 10 分鐘");

    freeRow.style.display = tier.paid ? "none" : "";
    hourRow.style.display = tier.unlimited ? "none" : "";
    dayRow.style.display = tier.unlimited ? "none" : "";

    if (!tier.paid) {
      const freePercent = Math.min(100, (daily.freeSeconds / FREE_DAILY_SECONDS) * 100);
      setFillState(freeFill, freePercent);
      freeText.textContent = `${formatSecondsLeft(FREE_DAILY_SECONDS - daily.freeSeconds)} 剩餘`;
    }

    if (!tier.unlimited) {
      setFillState(hourFill, (hourlyCost / PAID_HOURLY_QUOTA_TWD) * 100);
      setFillState(dayFill, (dailyCost / PAID_DAILY_QUOTA_TWD) * 100);
      hourText.textContent = `${formatPercent(hourlyCost, PAID_HOURLY_QUOTA_TWD)} / NT$${PAID_HOURLY_QUOTA_TWD}`;
      dayText.textContent = `${formatPercent(dailyCost, PAID_DAILY_QUOTA_TWD)} / NT$${PAID_DAILY_QUOTA_TWD}`;
    }
  }

  function toast(message, timeout) {
    ensureStyles();
    const el = document.createElement("div");
    el.className = "ais-membership-toast";
    el.textContent = message;
    document.body.appendChild(el);
    window.setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translate(-50%, 1rem)";
      el.style.transition = "opacity .25s ease, transform .25s ease";
    }, timeout || 3600);
    window.setTimeout(() => el.remove(), (timeout || 3600) + 320);
  }

  function forceLogout(reason) {
    toast(reason || "登入狀態已結束，請重新登入。", 2600);
    setTimeout(() => {
      if (window.AISchool) window.AISchool.clearCurrentUser();
      window.location.href = "index.html";
    }, 1800);
  }

  function tickFreeUsage() {
    const user = getUser();
    if (!user) return;
    const tier = getTier(user);
    if (tier.paid || tier.unlimited) return;
    if (document.hidden) return;

    const usage = readDailyUsage(user);
    usage.freeSeconds += 1;
    writeDailyUsage(user, usage);

    if (usage.freeSeconds >= 8 * 60 && !notices.freeEight) {
      notices.freeEight = true;
      toast("免費體驗剩餘約 2 分鐘。");
    }
    if (usage.freeSeconds >= 9 * 60 + 30 && !notices.freeNineThirty) {
      notices.freeNineThirty = true;
      toast("即將登出，請完成目前作答。", 4300);
    }
    if (usage.freeSeconds >= FREE_DAILY_SECONDS) {
      writeDailyUsage(user, { ...usage, freeSeconds: FREE_DAILY_SECONDS });
      renderWidget();
      forceLogout("今日AI額度已用完，可訂閱週訂制與月訂制。");
      return;
    }
    renderWidget();
  }

  function resetIdleClock() {
    lastActivityMs = Date.now();
  }

  function checkIdle() {
    const user = getUser();
    if (!user) return;
    const idleFor = Math.floor((Date.now() - lastActivityMs) / 1000);
    if (idleFor >= IDLE_SECONDS) {
      forceLogout("系統偵測已 20 分鐘未操作，為保護帳號安全已自動登出。");
    }
  }

  function usageLimitMessage() {
    return "今日AI額度已用完，可訂閱週訂制與月訂制。";
  }

  function ensureAiAllowance(costTwd, featureName) {
    const user = getUser();
    if (!user) return true;
    const tier = getTier(user);
    if (tier.unlimited) return true;

    const daily = readDailyUsage(user);
    const hourly = readHourlyUsage(user);

    if (!tier.paid && daily.freeSeconds >= FREE_DAILY_SECONDS) {
      toast(usageLimitMessage());
      return false;
    }

    const cost = Number(costTwd || 0) || 0;
    if (cost <= 0) return true;
    if (hourly.costTwd + cost > PAID_HOURLY_QUOTA_TWD || daily.costTwd + cost > PAID_DAILY_QUOTA_TWD) {
      toast(`AI用額不足，${featureName || "這項功能"}暫停新的 AI 呼叫；可明日再使用或升級贊助方案。`, 5200);
      return false;
    }
    return true;
  }

  function consumeAiCost(costTwd) {
    const user = getUser();
    if (!user || isExempt(user)) return;
    const cost = Number(costTwd || 0) || 0;
    if (cost <= 0) return;
    const daily = readDailyUsage(user);
    const hourly = readHourlyUsage(user);
    daily.costTwd = roundCost((daily.costTwd || 0) + cost);
    hourly.costTwd = roundCost((hourly.costTwd || 0) + cost);
    writeDailyUsage(user, daily);
    writeHourlyUsage(user, hourly);
    renderWidget();
  }

  function endpointKeyForUrl(url) {
    const source = String(url || "");
    const gas = window.AISchoolConfig && window.AISchoolConfig.gas ? window.AISchoolConfig.gas : {};
    return Object.keys(gas).find((key) => METERED_ENDPOINT_KEYS.has(key) && gas[key] && source.startsWith(String(gas[key])));
  }

  function patchFetch() {
    if (!originalFetch || fetchPatched) return;
    fetchPatched = true;
    window.fetch = function(input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const key = endpointKeyForUrl(url);
      if (key) {
        const cost = COST_BY_ENDPOINT_KEY[key] || 0.5;
        if (!ensureAiAllowance(cost, endpointLabel(key))) {
          return Promise.reject(new Error("AISCHOOL_AI_QUOTA_EXCEEDED"));
        }
        return originalFetch(input, init).then((response) => {
          consumeAiCost(cost);
          return response;
        });
      }
      return originalFetch(input, init);
    };
  }

  function patchSessionMutators() {
    if (!window.AISchool || window.AISchool.__membershipSessionPatched) return;
    const originalSetCurrentUser = typeof window.AISchool.setCurrentUser === "function"
      ? window.AISchool.setCurrentUser.bind(window.AISchool)
      : null;
    const originalClearCurrentUser = typeof window.AISchool.clearCurrentUser === "function"
      ? window.AISchool.clearCurrentUser.bind(window.AISchool)
      : null;

    if (originalSetCurrentUser) {
      window.AISchool.setCurrentUser = function(user) {
        const result = originalSetCurrentUser(user);
        setTimeout(initTimers, 0);
        return result;
      };
    }

    if (originalClearCurrentUser) {
      window.AISchool.clearCurrentUser = function() {
        const result = originalClearCurrentUser();
        setTimeout(initTimers, 0);
        return result;
      };
    }

    window.AISchool.__membershipSessionPatched = true;
  }

  function endpointLabel(key) {
    const labels = {
      cloudTts: "AI語音",
      studentAdaptiveTesting: "AI適性測驗",
      studentUnitCoreIdea: "單元概念精熟",
      studentBilingualTracking: "科學雙語聽讀",
      teacherItemVocabulary: "命題用語檢核",
      teacherCatReview: "CAT診斷報表"
    };
    return labels[key] || "AI功能";
  }

  async function callBilling(payload) {
    const info = window.AISchool && window.AISchool.getGasUrlInfo
      ? window.AISchool.getGasUrlInfo("membershipBilling")
      : null;
    if (!info || !info.isConfigured) {
      throw new Error("MEMBERSHIP_BACKEND_NOT_CONFIGURED");
    }
    const response = await originalFetch(info.url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    const json = safeJson(text, null);
    if (!json) throw new Error("MEMBERSHIP_BACKEND_BAD_RESPONSE");
    if (json.ok === false) throw new Error(json.message || json.error || "MEMBERSHIP_BACKEND_ERROR");
    return json;
  }

  async function refreshMembershipStatus() {
    const user = getUser();
    if (!user) return null;
    try {
      const result = await callBilling({ action: "membershipStatus", email: user.email, role: user.role });
      remoteStatus = result.status || result.user || result.data || result;
      renderWidget();
      return remoteStatus;
    } catch {
      renderWidget();
      return null;
    }
  }

  async function startEcpayCheckout(plan) {
    const user = getUser();
    if (!user) {
      toast("請先登入後再升級贊助方案。");
      return;
    }
    try {
      const result = await callBilling({
        action: "createEcpayOrder",
        plan,
        email: user.email,
        role: user.role,
        name: user.name
      });
      const form = result.form || result.paymentForm;
      if (!form || !form.action || !form.params) throw new Error("PAYMENT_FORM_MISSING");
      submitPaymentForm(form.action, form.params);
    } catch (err) {
      if (String(err.message || "").includes("NOT_CONFIGURED")) {
        toast("金流設定待管理者啟用。綠界 MerchantID、HashKey、HashIV 完成設定後即可開放贊助升級。", 5600);
      } else {
        toast("暫時無法建立付款頁，請稍後再試。");
      }
    }
  }

  function submitPaymentForm(action, params) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";
    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value == null ? "" : String(value);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  async function requestPasswordChange(currentPassword, newPassword) {
    const user = getUser();
    if (!user) throw new Error("請先登入。");
    return callBilling({
      action: "requestPasswordChange",
      email: user.email,
      role: user.role,
      currentPassword,
      newPassword
    });
  }

  function openAccountPanel() {
    window.location.href = "account_settings.html";
  }

  function logoutWithSurvey(roleLabel) {
    const user = getUser();
    if (!user) {
      forceLogout("登入狀態已結束，請重新登入。");
      return;
    }
    ensureStyles();
    let rating = 0;
    const backdrop = document.createElement("div");
    backdrop.className = "ais-modal-backdrop";
    backdrop.innerHTML = `
      <section class="ais-modal" role="dialog" aria-modal="true" aria-label="登出回饋">
        <header>
          <h2>離開前，想聽聽你的使用感受</h2>
        </header>
        <div class="ais-modal-body">
          <p style="margin:0;color:#cbd5e1;font-weight:800;line-height:1.8;">你的回饋會協助我們調整 AI School 的學習節奏、介面與功能品質。</p>
          <div class="ais-rating" aria-label="滿意度">
            ${[1,2,3,4,5].map((n) => `<button type="button" data-rating="${n}">${n}</button>`).join("")}
          </div>
          <textarea rows="4" placeholder="想補充的建議，也可以留白。"></textarea>
        </div>
        <footer>
          <button class="secondary" type="button" data-skip>略過並登出</button>
          <button class="primary" type="button" data-submit>送出並登出</button>
        </footer>
      </section>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelectorAll("[data-rating]").forEach((btn) => {
      btn.addEventListener("click", () => {
        rating = Number(btn.getAttribute("data-rating"));
        backdrop.querySelectorAll("[data-rating]").forEach((item) => item.classList.toggle("is-selected", Number(item.getAttribute("data-rating")) <= rating));
      });
    });
    const finish = async (withSubmit) => {
      if (withSubmit) {
        const comment = backdrop.querySelector("textarea").value.trim();
        await sendFeedback({ rating, comment, role: roleLabel || user.role });
      }
      backdrop.remove();
      forceLogout("已登出，期待下次再一起學習。");
    };
    backdrop.querySelector("[data-skip]").addEventListener("click", () => finish(false));
    backdrop.querySelector("[data-submit]").addEventListener("click", () => finish(true));
  }

  async function sendFeedback(payload) {
    const user = getUser();
    try {
      if (window.AISchoolLearning && typeof window.AISchoolLearning.track === "function") {
        await window.AISchoolLearning.track("logout_feedback", { user, ...payload });
        return;
      }
      const info = window.AISchool && window.AISchool.getGasUrlInfo
        ? window.AISchool.getGasUrlInfo("learningAnalytics")
        : null;
      if (!info || !info.isConfigured) return;
      await originalFetch(info.url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "logout_feedback", user, ...payload, at: new Date().toISOString() })
      });
    } catch {}
  }

  function initTimers() {
    clearInterval(freeTimer);
    clearInterval(idleTimer);
    clearInterval(quotaRefreshTimer);
    notices = {};
    const user = getUser();
    if (!user) {
      renderWidget();
      return;
    }
    renderWidget();
    freeTimer = setInterval(tickFreeUsage, 1000);
    idleTimer = setInterval(checkIdle, 15000);
    quotaRefreshTimer = setInterval(refreshMembershipStatus, 5 * 60 * 1000);
    refreshMembershipStatus();
  }

  function initActivityListeners() {
    ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach((eventName) => {
      window.addEventListener(eventName, resetIdleClock, { passive: true });
    });
  }

  function init() {
    ensureStyles();
    ensureWidget();
    patchSessionMutators();
    patchFetch();
    initActivityListeners();
    initTimers();
    window.addEventListener("storage", renderWidget);
    document.addEventListener("visibilitychange", renderWidget);
  }

  window.AISchoolMembership = {
    ensureAiAllowance,
    consumeAiCost,
    forceLogout,
    getTier,
    logoutWithSurvey,
    openAccountPanel,
    refreshMembershipStatus,
    renderWidget,
    requestPasswordChange,
    startEcpayCheckout
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
