(function() {
  const SESSION_USER_KEY = "currentUser";
  const FLASH_MESSAGE_KEY = "redirectMsg";
  const PRIMARY_LANGUAGE_KEY = "AISCHOOL_LANG";
  const LEGACY_LANGUAGE_KEYS = ["AI_SCHOOL_LANG", "slh_lang", "appLang"];
  const LEGACY_USER_STORAGE_KEYS = ["currentUser"];
  const GAS_ENDPOINT_OVERRIDE_KEY = "AISCHOOL_GAS_OVERRIDES";
  const SPREADSHEET_OVERRIDE_KEY = "AISCHOOL_SPREADSHEET_OVERRIDES";
  const PRIMARY_SPREADSHEET_ID = "1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8";
  const LEGACY_SCIENCE_CONTENT_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbgkNiMflfeLQd3KN8F4yjjIr6G2flnCAy-nUPMiC7_xDfdg_0hJ2Qzbsr92u8htlPLFR8GwwQPK_g/pub?gid=0&single=true&output=csv";
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
    cloudTts: "",
    studentAdaptiveTesting: "https://script.google.com/macros/s/AKfycbxvAOgRDBE6T-2R37UeTzo0RSQukgGOlEYyBrTw8zUSOlIKNIzLdJXozjNx4Hn6brc2/exec",
    studentUnitCoreIdea: "https://script.google.com/macros/s/AKfycbynf2DkhZ6V9lCLH3MH-Ud7DjTMPDKAu2DJm3OC22lTYaPJe5TiA8GRfyG0lihLUZxa/exec",
    studentBilingualTracking: "https://script.google.com/macros/s/AKfycbwXvqOFGVuay1_jZ7dau5VkNqSqGppQ3ffIizlcyB4R0XwvQU7Km5JFuYR4wfFG2OMxHA/exec",
    learningAnalytics: "https://script.google.com/macros/s/AKfycbwa509Hdkh8d55bRs8x4GVHySPjGr4zkT4JulZNcoGwpJzPFcxhdQ__dm9ztTlQZMsn9g/exec"
  };
  const GAS_ENDPOINT_FALLBACKS = {
    teacherCatReview: "studentAdaptiveTesting"
  };
  const SPREADSHEET_CONFIG = Object.freeze({
    aiSchoolSpreadsheetId: PRIMARY_SPREADSHEET_ID,
    scienceContentSpreadsheetId: PRIMARY_SPREADSHEET_ID,
    scienceContentSheetName: "Sheet1",
    scienceContentCsvUrl: "",
    scienceLegacyContentCsvUrl: LEGACY_SCIENCE_CONTENT_CSV_URL,
    scienceUserSpreadsheetId: PRIMARY_SPREADSHEET_ID,
    scienceUserSheetName: "Users_student",
    scienceUserStudentIdCol: "J"
  });
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

  function getSpreadsheetOverrides() {
    const parsed = safeParse(localStorage.getItem(SPREADSHEET_OVERRIDE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function normalizeSpreadsheetConfig(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = {};

    Object.keys(SPREADSHEET_CONFIG).forEach((key) => {
      const value = source[key];
      if (value === undefined || value === null) return;
      next[key] = String(value).trim();
    });

    return next;
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

  function getSpreadsheetConfig() {
    const overrides = normalizeSpreadsheetConfig(getSpreadsheetOverrides());
    const merged = {
      ...SPREADSHEET_CONFIG,
      ...overrides
    };

    const primaryId = merged.aiSchoolSpreadsheetId || PRIMARY_SPREADSHEET_ID;
    const explicitScienceContentId = merged.scienceContentSpreadsheetId || primaryId;
    const explicitScienceUserId = merged.scienceUserSpreadsheetId || primaryId;
    const explicitCsvUrl = String(merged.scienceContentCsvUrl || "").trim();
    const legacyCsvUrl = String(
      merged.scienceLegacyContentCsvUrl || LEGACY_SCIENCE_CONTENT_CSV_URL
    ).trim();

    return {
      ...merged,
      aiSchoolSpreadsheetId: primaryId,
      scienceContentSpreadsheetId: explicitScienceContentId,
      scienceUserSpreadsheetId: explicitScienceUserId,
      scienceContentCsvUrl: explicitCsvUrl || legacyCsvUrl,
      scienceContentCsvUrlSource: explicitCsvUrl ? "configured" : "legacy-fallback",
      requiresPublishedScienceContentCsv: !explicitCsvUrl,
      hasPublishedScienceContentCsv: Boolean(explicitCsvUrl)
    };
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

  function setSpreadsheetOverride(key, value) {
    if (!(key in SPREADSHEET_CONFIG)) {
      throw new Error(`Unknown spreadsheet config key: ${key}`);
    }

    const overrides = getSpreadsheetOverrides();
    const nextValue = String(value || "").trim();

    if (!nextValue) {
      delete overrides[key];
    } else {
      overrides[key] = nextValue;
    }

    localStorage.setItem(SPREADSHEET_OVERRIDE_KEY, JSON.stringify(overrides));
    return getSpreadsheetConfig();
  }

  function installUiPolish() {
    if (typeof document === "undefined" || document.getElementById("aischool-ui-polish")) return;

    const style = document.createElement("style");
    style.id = "aischool-ui-polish";
    style.textContent = `
      :root {
        --ais-ui-accent: #38bdf8;
        --ais-ui-accent-strong: #22c55e;
        --ais-ui-surface: rgba(15, 23, 42, 0.74);
        --ais-ui-surface-hover: rgba(30, 41, 59, 0.88);
        --ais-ui-border: rgba(148, 163, 184, 0.26);
        --ais-ui-border-hover: rgba(56, 189, 248, 0.54);
        --ais-ui-text: #e2e8f0;
      }

      select:not([multiple]),
      .input-ai:is(select),
      .filter-select:is(select),
      .vl-select:is(select) {
        appearance: none;
        -webkit-appearance: none;
        min-height: 2.65rem;
        padding-right: 2.75rem !important;
        color: var(--ais-ui-text);
        border-color: var(--ais-ui-border) !important;
        background-color: var(--ais-ui-surface) !important;
        background-image:
          linear-gradient(45deg, transparent 50%, currentColor 50%),
          linear-gradient(135deg, currentColor 50%, transparent 50%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.12));
        background-position:
          calc(100% - 1.15rem) 52%,
          calc(100% - 0.82rem) 52%,
          0 0;
        background-size: 0.36rem 0.36rem, 0.36rem 0.36rem, 100% 100%;
        background-repeat: no-repeat;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 28px rgba(2, 6, 23, 0.12);
        transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease, transform 160ms ease;
      }

      select:not([multiple]):hover,
      .input-ai:is(select):hover,
      .filter-select:is(select):hover,
      .vl-select:is(select):hover {
        border-color: var(--ais-ui-border-hover) !important;
        background-color: var(--ais-ui-surface-hover) !important;
      }

      select:not([multiple]):disabled {
        opacity: 0.54;
        cursor: not-allowed;
        filter: saturate(0.72);
      }

      select:not([multiple]) option {
        background: #0f172a;
        color: #f8fafc;
      }

      button,
      [role="button"],
      select,
      input,
      textarea,
      a {
        -webkit-tap-highlight-color: transparent;
      }

      button:focus-visible,
      [role="button"]:focus-visible,
      select:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      a:focus-visible {
        outline: 3px solid rgba(56, 189, 248, 0.45);
        outline-offset: 3px;
      }

      button:disabled,
      [aria-disabled="true"] {
        opacity: 0.48;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  installUiPolish();

  window.AISchoolConfig = {
    gas: GAS_ENDPOINTS,
    spreadsheets: SPREADSHEET_CONFIG
  };
  window.AISchool = {
    clearCurrentUser,
    getCurrentUser,
    getGasUrl,
    getGasUrlInfo,
    getLanguage,
    getSpreadsheetConfig,
    isPlaceholderGasUrl,
    normalizeRole,
    normalizeUser,
    readFlashMessage,
    requireRole,
    setCurrentUser,
    setGasOverride,
    setSpreadsheetOverride,
    setFlashMessage,
    setLanguage
  };
})();
