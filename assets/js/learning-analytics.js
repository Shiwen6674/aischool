(function () {
  "use strict";

  const SESSION_KEY = "aischool.learning.sessionId";
  const ADMIN_TOKEN_KEY = "AISCHOOL_ADMIN_TOKEN";
  const JSONP_TIMEOUT_MS = 20000;
  let jsonpSeq = 0;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeString(value) {
    if (value === undefined || value === null) return "";
    return String(value);
  }

  function getCurrentUser() {
    try {
      if (window.AISchool && typeof window.AISchool.getCurrentUser === "function") {
        return window.AISchool.getCurrentUser() || {};
      }
    } catch (err) {
      console.warn("[AISchoolLearning] Unable to read current user.", err);
    }
    return {};
  }

  function getEndpoint() {
    try {
      if (window.AISchool && typeof window.AISchool.getGasUrl === "function") {
        return window.AISchool.getGasUrl("learningAnalytics") || "";
      }
    } catch (err) {
      console.warn("[AISchoolLearning] Unable to read learningAnalytics endpoint.", err);
    }
    return "";
  }

  function hasEndpoint() {
    const endpoint = getEndpoint();
    if (!endpoint) return false;
    if (window.AISchool && typeof window.AISchool.isPlaceholderGasUrl === "function") {
      return !window.AISchool.isPlaceholderGasUrl(endpoint);
    }
    return !/\bexample\.com\b/i.test(endpoint);
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        const cryptoObj = window.crypto || window.msCrypto;
        const randomPart = cryptoObj && cryptoObj.getRandomValues
          ? Array.from(cryptoObj.getRandomValues(new Uint32Array(2))).map((n) => n.toString(36)).join("")
          : Math.random().toString(36).slice(2, 12);
        id = `learn_${Date.now().toString(36)}_${randomPart}`;
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (err) {
      return `learn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function normalizeBoolean(value) {
    if (value === true || value === false) return value;
    if (value === undefined || value === null || value === "") return "";
    const text = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "y", "correct", "right", "對", "是"].includes(text)) return true;
    if (["false", "0", "no", "n", "incorrect", "wrong", "錯", "否"].includes(text)) return false;
    return value;
  }

  function pick(details, keys) {
    for (const key of keys) {
      if (details && details[key] !== undefined && details[key] !== null && details[key] !== "") {
        return details[key];
      }
    }
    return "";
  }

  function buildPayload(moduleName, eventName, details) {
    const user = getCurrentUser();
    const data = details || {};
    const metadata = Object.assign({}, data);
    return {
      action: "log_event",
      schema_version: "2026-04-learning-analytics-v1",
      client_time: nowIso(),
      session_id: pick(data, ["session_id", "sessionId"]) || getSessionId(),
      student_id: pick(data, ["student_id", "studentId"]) || safeString(user.student_id || user.studentId || user.id || user.account),
      student_name: pick(data, ["student_name", "studentName", "userName", "name"]) || safeString(user.name || user.userName),
      account: pick(data, ["account", "username"]) || safeString(user.account || user.username || user.id),
      email: pick(data, ["email", "mail"]) || safeString(user.email || user.mail),
      role: pick(data, ["role"]) || safeString(user.role || "student"),
      module: moduleName || pick(data, ["module"]) || "",
      event: eventName || pick(data, ["event"]) || "",
      page: pick(data, ["page"]) || (location.pathname || "").split("/").pop() || "unknown",
      stage: pick(data, ["stage", "schoolStage"]),
      grade: pick(data, ["grade"]),
      semester: pick(data, ["semester"]),
      publisher: pick(data, ["publisher", "textbook_version", "version"]),
      unit: pick(data, ["unit", "unitName", "unit_name"]),
      concept_tag: pick(data, ["concept_tag", "concept", "conceptName", "tag"]),
      item_id: pick(data, ["item_id", "itemId"]),
      response: pick(data, ["response", "response_option", "selected", "selectedKey"]),
      correct: normalizeBoolean(pick(data, ["correct", "isCorrect"])),
      score: pick(data, ["score", "score100", "score_100", "accuracy"]),
      duration: pick(data, ["duration", "duration_sec", "durationMs", "elapsed"]),
      progress_percent: pick(data, ["progress_percent", "progressPercent", "progress"]),
      metadata_json: JSON.stringify(metadata),
      user_agent: navigator.userAgent || ""
    };
  }

  function postPayload(payload) {
    if (!hasEndpoint()) return Promise.resolve({ ok: false, skipped: true, reason: "missing_endpoint" });
    const endpoint = getEndpoint();
    return fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(() => ({ ok: true }))
      .catch((error) => {
        console.warn("[AISchoolLearning] tracking failed", error);
        return { ok: false, error: String(error && error.message ? error.message : error) };
      });
  }

  function track(moduleName, eventName, details) {
    const payload = buildPayload(moduleName, eventName, details || {});
    return postPayload(payload);
  }

  function trackBatch(events) {
    if (!Array.isArray(events) || !events.length) return Promise.resolve({ ok: true, skipped: true });
    const payload = {
      action: "log_events",
      schema_version: "2026-04-learning-analytics-v1",
      events: events.map((entry) => buildPayload(entry.module, entry.event, entry.details || entry))
    };
    return postPayload(payload);
  }

  function trackPageView(moduleName, details) {
    return track(moduleName, "page_view", details || {});
  }

  function trackPageLeave(moduleName, details) {
    const data = Object.assign({}, details || {});
    if (!data.duration && window.performance && performance.now) {
      data.duration = Math.round(performance.now() / 1000);
    }
    return track(moduleName, "page_leave", data);
  }

  function getAdminToken() {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function setAdminToken(token) {
    try {
      if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
      else localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (err) {
      console.warn("[AISchoolLearning] Unable to store admin token.", err);
    }
  }

  function adminQuery(action, params) {
    return new Promise((resolve, reject) => {
      if (!hasEndpoint()) {
        reject(new Error("尚未設定 learningAnalytics Apps Script URL"));
        return;
      }

      const endpoint = getEndpoint();
      const user = getCurrentUser();
      const callbackName = `__aischoolLearningJsonp_${Date.now()}_${jsonpSeq++}`;
      const query = new URLSearchParams(Object.assign({}, params || {}, {
        action,
        callback: callbackName,
        account: safeString(user.account || user.username || user.id),
        email: safeString(user.email || user.mail),
        userName: safeString(user.name || user.userName),
        role: safeString(user.role || ""),
        adminToken: getAdminToken()
      }));
      const sep = endpoint.includes("?") ? "&" : "?";
      const script = document.createElement("script");
      let completed = false;
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("讀取 admin 資料逾時，請檢查 Apps Script 部署與權限。"));
      }, JSONP_TIMEOUT_MS);

      function cleanup() {
        completed = true;
        window.clearTimeout(timer);
        try { delete window[callbackName]; } catch (err) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = (data) => {
        if (completed) return;
        cleanup();
        if (data && data.ok === false) {
          reject(new Error(data.error || "admin 查詢失敗"));
          return;
        }
        resolve(data);
      };

      script.onerror = () => {
        if (completed) return;
        cleanup();
        reject(new Error("無法載入 Apps Script 回應，請確認部署 URL 可公開執行。"));
      };

      script.src = `${endpoint}${sep}${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  window.AISchoolLearning = {
    ADMIN_TOKEN_KEY,
    getSessionId,
    getEndpoint,
    hasEndpoint,
    track,
    trackBatch,
    trackPageView,
    trackPageLeave,
    adminQuery,
    getAdminToken,
    setAdminToken
  };
})();
