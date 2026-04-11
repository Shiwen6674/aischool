(function() {
  const SESSION_USER_KEY = "currentUser";
  const FLASH_MESSAGE_KEY = "redirectMsg";
  const PRIMARY_LANGUAGE_KEY = "AISCHOOL_LANG";
  const LEGACY_LANGUAGE_KEYS = ["AI_SCHOOL_LANG", "slh_lang", "appLang"];
  const LEGACY_USER_STORAGE_KEYS = ["currentUser"];
  const GAS_ENDPOINT_OVERRIDE_KEY = "AISCHOOL_GAS_OVERRIDES";
  const GAS_ENDPOINTS = {
    authHub: "https://script.google.com/macros/s/AKfycbzcDKkz8Tilzb3qbx0_fDR7QoG4-c2JCtsa4p9V8_1gBjZaEMlvQHd72OD0kZq_jW8H/exec",
    teacherItemVocabulary: "https://script.google.com/macros/s/AKfycbxbZPCCWFwFel6KjEzga-P_YJJccBevBMMCmgq_qVt1PfQEl2Som7z-DD2rU8kexrnGtA/exec",
    teacherCatReview: "https://script.google.com/macros/s/你的發布ID/exec",
    professorSegmentation: "https://script.google.com/macros/s/AKfycbxt_6RXtT2DklrwLO7g2jQ4LnfTDEvpS1jQ-f4gRf-N_QOwBzT1_SfaDf1CPNBtZ1Z5Yg/exec",
    professorSfl: "https://script.google.com/macros/s/AKfycbxbW0q_tOM6woE9lt6r9Nbf-MUIdS4jgTYsWVTj-kViSDQ2Ymu4RmKzPrrLMjO2FSq6uQ/exec",
    professorScienceQuery: "https://script.google.com/macros/s/AKfycbyswFkjh-wlWpgZMD02eyO4vBhLX2-HdkYY4AAaonG-LxJuL5Ioi02MyZukgj73q82b_A/exec",
    professorReadability: "https://script.google.com/macros/s/AKfycbwUe1jcuUo3lk2jR8R0ubCRLlcfa0XJJQhVXS_7nEmm2svslmyeDeP4XT-S_PmUu2T69w/exec",
    professorTextSimilarity: "https://script.google.com/macros/s/AKfycbwLgjsVkgeRU6XMPNTLJkDpkO7HOuD4mW-RmNG6fExlHuMsmRsl-0YlcrDQ3o51M31psw/exec",
    professorWordcloud: "https://script.google.com/macros/s/AKfycbw3UqYr976wAd9aeEsLpTDSlGaUVdBpaErqZi-zHgNzh_Gd0SuggfdI7ldVzrqR1Ygd/exec",
    studentAdaptiveTesting: "https://script.google.com/macros/s/AKfycbxvAOgRDBE6T-2R37UeTzo0RSQukgGOlEYyBrTw8zUSOlIKNIzLdJXozjNx4Hn6brc2/exec",
    studentUnitCoreIdea: "https://script.google.com/macros/s/AKfycbynf2DkhZ6V9lCLH3MH-Ud7DjTMPDKAu2DJm3OC22lTYaPJe5TiA8GRfyG0lihLUZxa/exec",
    studentBilingualTracking: "https://script.google.com/macros/s/AKfycbwXvqOFGVuay1_jZ7dau5VkNqSqGppQ3ffIizlcyB4R0XwvQU7Km5JFuYR4wfFG2OMxHA/exec"
  };
  const GAS_ENDPOINT_FALLBACKS = {
    teacherCatReview: "studentAdaptiveTesting"
  };
  const SESSION_KEYS_TO_CLEAR = [
    SESSION_USER_KEY,
    FLASH_MESSAGE_KEY,
    "isLoggedIn",
    "last_professor_feature",
    "wordcloud_context"
  ];

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isPlaceholderGasUrl(url) {
    const value = String(url || "").trim();
    if (!value) return true;

    return /你的發布ID|your[-_\s]?deploy[-_\s]?id|changeme|example\.com/i.test(value);
  }

  function getGasOverrides() {
    const parsed = safeParse(localStorage.getItem(GAS_ENDPOINT_OVERRIDE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function normalizeRole(role) {
    return role === "researcher" ? "professor" : String(role || "").trim();
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") return null;

    return {
      ...user,
      email: user.email || user.Email || "",
      name: user.name || user.Name || user.username || user.email || user.Email || "User",
      role: normalizeRole(user.role || user.Role || ""),
      account: user.account || user.Account || "",
      id:
        user.id ||
        user.ID ||
        user.email ||
        user.Email ||
        user.account ||
        user.Account ||
        ""
    };
  }

  function getCurrentUser() {
    const sessionUser = normalizeUser(safeParse(sessionStorage.getItem(SESSION_USER_KEY)));
    if (sessionUser) return sessionUser;

    for (const key of LEGACY_USER_STORAGE_KEYS) {
      const localUser = normalizeUser(safeParse(localStorage.getItem(key)));
      if (localUser) return localUser;
    }
    return null;
  }

  function setCurrentUser(user) {
    const normalized = normalizeUser(user);
    if (!normalized) {
      clearCurrentUser();
      return;
    }
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(normalized));
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(normalized));
    sessionStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("isLoggedIn", "true");
  }

  function clearCurrentUser() {
    SESSION_KEYS_TO_CLEAR.forEach((key) => sessionStorage.removeItem(key));
    SESSION_KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
  }

  function setFlashMessage(message) {
    if (!message) return;
    sessionStorage.setItem(FLASH_MESSAGE_KEY, String(message));
  }

  function readFlashMessage() {
    const message = sessionStorage.getItem(FLASH_MESSAGE_KEY) || "";
    if (message) {
      sessionStorage.removeItem(FLASH_MESSAGE_KEY);
    }
    return message;
  }

  function getLanguage(fallback) {
    const keys = [PRIMARY_LANGUAGE_KEY].concat(LEGACY_LANGUAGE_KEYS);
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return fallback || "zh-TW";
  }

  function setLanguage(language) {
    const value = String(language || "").trim();
    if (!value) return;

    localStorage.setItem(PRIMARY_LANGUAGE_KEY, value);
    LEGACY_LANGUAGE_KEYS.forEach((key) => localStorage.setItem(key, value));
  }

  function requireRole(allowedRoles, redirectMessage, redirectTo) {
    const user = getCurrentUser();
    const normalizedAllowed = new Set((allowedRoles || []).map(normalizeRole));

    if (user && normalizedAllowed.has(user.role)) {
      return user;
    }

    if (redirectMessage) {
      setFlashMessage(redirectMessage);
    }
    if (redirectTo) {
      window.location.replace(redirectTo);
    }
    return null;
  }

  function getGasUrlInfo(key, fallback) {
    const overrides = getGasOverrides();
    const overrideUrl = String(overrides[key] || "").trim();

    if (overrideUrl && !isPlaceholderGasUrl(overrideUrl)) {
      return {
        key,
        url: overrideUrl,
        source: "override",
        fallbackKey: "",
        isPlaceholder: false,
        isConfigured: true
      };
    }

    const directUrl = String(GAS_ENDPOINTS[key] || "").trim();
    if (directUrl && !isPlaceholderGasUrl(directUrl)) {
      return {
        key,
        url: directUrl,
        source: "default",
        fallbackKey: "",
        isPlaceholder: false,
        isConfigured: true
      };
    }

    const fallbackKey = GAS_ENDPOINT_FALLBACKS[key] || "";
    const fallbackUrl = fallbackKey ? String(GAS_ENDPOINTS[fallbackKey] || "").trim() : "";
    if (fallbackUrl && !isPlaceholderGasUrl(fallbackUrl)) {
      return {
        key,
        url: fallbackUrl,
        source: `fallback:${fallbackKey}`,
        fallbackKey,
        isPlaceholder: false,
        isConfigured: true
      };
    }

    const legacyFallback = String(fallback || "").trim();
    const hasLegacyFallback = legacyFallback && !isPlaceholderGasUrl(legacyFallback);

    return {
      key,
      url: hasLegacyFallback ? legacyFallback : directUrl || legacyFallback || "",
      source: hasLegacyFallback ? "callsite-fallback" : (directUrl ? "placeholder" : "missing"),
      fallbackKey,
      isPlaceholder: true,
      isConfigured: hasLegacyFallback
    };
  }

  function getGasUrl(key, fallback) {
    return getGasUrlInfo(key, fallback).url;
  }

  function setGasOverride(key, url) {
    const overrides = getGasOverrides();
    const value = String(url || "").trim();

    if (!value) {
      delete overrides[key];
    } else {
      overrides[key] = value;
    }

    localStorage.setItem(GAS_ENDPOINT_OVERRIDE_KEY, JSON.stringify(overrides));
    return getGasUrlInfo(key);
  }

  window.AISchoolConfig = {
    gas: GAS_ENDPOINTS
  };
  window.AISchool = {
    clearCurrentUser,
    getCurrentUser,
    getGasUrl,
    getGasUrlInfo,
    getLanguage,
    isPlaceholderGasUrl,
    normalizeRole,
    normalizeUser,
    readFlashMessage,
    requireRole,
    setCurrentUser,
    setGasOverride,
    setFlashMessage,
    setLanguage
  };
})();
