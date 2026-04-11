(function() {
  const SESSION_USER_KEY = "currentUser";
  const FLASH_MESSAGE_KEY = "redirectMsg";
  const PRIMARY_LANGUAGE_KEY = "AISCHOOL_LANG";
  const LEGACY_LANGUAGE_KEYS = ["AI_SCHOOL_LANG", "slh_lang", "appLang"];
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
    return normalizeUser(safeParse(sessionStorage.getItem(SESSION_USER_KEY)));
  }

  function setCurrentUser(user) {
    const normalized = normalizeUser(user);
    if (!normalized) {
      clearCurrentUser();
      return;
    }
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(normalized));
  }

  function clearCurrentUser() {
    SESSION_KEYS_TO_CLEAR.forEach((key) => sessionStorage.removeItem(key));
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

  window.AISchool = {
    clearCurrentUser,
    getCurrentUser,
    getLanguage,
    normalizeRole,
    normalizeUser,
    readFlashMessage,
    requireRole,
    setCurrentUser,
    setFlashMessage,
    setLanguage
  };
})();
