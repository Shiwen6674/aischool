(function() {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readState(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return { completed: {}, notes: "" };
      }
      const parsed = JSON.parse(raw);
      return {
        completed: parsed && typeof parsed.completed === "object" ? parsed.completed : {},
        notes: typeof parsed.notes === "string" ? parsed.notes : ""
      };
    } catch {
      return { completed: {}, notes: "" };
    }
  }

  function writeState(storageKey, state) {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function renderCards(items, cardClass) {
    return (items || [])
      .map(function(item) {
        const href = escapeHtml(item.href || "#");
        const meta = item.meta ? '<div class="hub-card-meta">' + escapeHtml(item.meta) + "</div>" : "";
        const cta = escapeHtml(item.cta || "前往查看");
        return [
          '<a class="' + cardClass + '" href="' + href + '">',
          meta,
          '<h3 class="hub-card-title">' + escapeHtml(item.title) + "</h3>",
          '<p class="hub-card-text">' + escapeHtml(item.description) + "</p>",
          '<span class="hub-card-link">' + cta + ' <i class="fa-solid fa-arrow-right"></i></span>',
          "</a>"
        ].join("");
      })
      .join("");
  }

  function renderPrompts(items) {
    return (items || [])
      .map(function(item) {
        return [
          '<div class="hub-prompt-card">',
          '<h3 class="hub-card-title">' + escapeHtml(item.title) + "</h3>",
          '<p class="hub-card-text">' + escapeHtml(item.description) + "</p>",
          "</div>"
        ].join("");
      })
      .join("");
  }

  function renderChecklist(items) {
    return (items || [])
      .map(function(item, index) {
        return [
          '<label class="hub-check-item" data-check-row="' + index + '">',
          '<input type="checkbox" data-check="' + index + '">',
          '<span class="hub-check-text">' + escapeHtml(item) + "</span>",
          "</label>"
        ].join("");
      })
      .join("");
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") {
      return { name: "同學", account: "" };
    }
    return {
      name: user.name || user.email || user.account || "同學",
      account: user.account || user.email || user.id || ""
    };
  }

  function updateChecklistUI(root, state, total) {
    let completedCount = 0;
    root.querySelectorAll("[data-check]").forEach(function(input) {
      const key = input.getAttribute("data-check");
      const checked = Boolean(state.completed[key]);
      input.checked = checked;
      const row = root.querySelector('[data-check-row="' + key + '"]');
      if (row) {
        row.classList.toggle("is-complete", checked);
      }
      if (checked) {
        completedCount += 1;
      }
    });

    const ratio = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const fill = root.querySelector("[data-progress-fill]");
    const label = root.querySelector("[data-progress-label]");
    if (fill) {
      fill.style.width = ratio + "%";
    }
    if (label) {
      label.textContent = completedCount + " / " + total + " 完成";
    }
  }

  function mountHub() {
    const config = window.AISchoolHubConfig;
    const app = document.getElementById("app");
    if (!config || !app) {
      return;
    }

    const defaultAuthMessage = "請先登入學生帳號，再使用這個學習中心。";
    const guardedUser =
      window.AISchool && typeof window.AISchool.requireRole === "function"
        ? window.AISchool.requireRole(["student"], config.authMessage || defaultAuthMessage, "index.html")
        : null;

    if (window.AISchool && typeof window.AISchool.setLanguage === "function") {
      window.AISchool.setLanguage(window.AISchool.getLanguage("zh-TW"));
    }

    const storageKey = "aischool-hub:" + (config.slug || config.title || "default");
    const state = readState(storageKey);
    const safeUser = normalizeUser(
      guardedUser ||
        (window.AISchool && window.AISchool.getCurrentUser ? window.AISchool.getCurrentUser() : null)
    );
    const stats = config.stats || [];
    const goals = config.goals || [];
    const checklist = config.checklist || [];
    const pathways = config.pathways || [];
    const resources = config.resources || [];
    const prompts = config.prompts || [];

    document.title = "AI School | " + (config.title || "學習中心");
    document.documentElement.lang = "zh-TW";
    document.body.style.setProperty("--hub-accent", config.accent || "#38bdf8");
    document.body.style.setProperty("--hub-accent-soft", config.accentSoft || "rgba(56, 189, 248, 0.18)");
    document.body.style.setProperty("--hub-accent-strong", config.accentStrong || "rgba(56, 189, 248, 0.35)");

    app.innerHTML = [
      '<div class="hub-shell">',
      '  <div class="hub-container">',
      '    <div class="hub-topbar">',
      '      <a class="hub-brand" href="' + escapeHtml((config.parent && config.parent.href) || "student_subject.html") + '">',
      '        <span class="hub-brand-icon"><i class="' + escapeHtml(config.icon || "fa-solid fa-graduation-cap") + '"></i></span>',
      '        <span>AI School Learning Hub</span>',
      "      </a>",
      '      <div class="hub-topbar-actions">',
      '        <a class="hub-link-button" href="index.html"><i class="fa-solid fa-house"></i> 回首頁</a>',
      '        <a class="hub-link-button" href="' + escapeHtml((config.parent && config.parent.href) || "student_subject.html") + '"><i class="fa-solid fa-chevron-left"></i> 返回上一層</a>',
      "      </div>",
      "    </div>",
      '    <section class="hub-hero">',
      '      <div class="hub-breadcrumbs">',
      '        <a href="index.html">首頁</a>',
      '        <span>/</span>',
      '        <a href="student_subject.html">學生學習模組</a>',
      config.parent && config.parent.href && config.parent.label
        ? '        <span>/</span><a href="' + escapeHtml(config.parent.href) + '">' + escapeHtml(config.parent.label) + "</a>"
        : "",
      '        <span>/</span><span>' + escapeHtml(config.title) + "</span>",
      "      </div>",
      '      <div class="hub-hero-grid">',
      "        <div>",
      '          <span class="hub-eyebrow"><i class="fa-solid fa-sparkles"></i> ' + escapeHtml(config.eyebrow || "Student Hub") + "</span>",
      '          <h1 class="hub-title">' + escapeHtml(config.title) + "</h1>",
      '          <p class="hub-description">' + escapeHtml(config.description || "") + "</p>",
      '          <div class="hub-pill-row">',
      '            <span class="hub-user-chip"><i class="fa-solid fa-user"></i> 目前帳號：<strong>' + escapeHtml(safeUser.name) + "</strong></span>",
      config.studyTime
        ? '            <span class="hub-pill"><i class="fa-regular fa-clock"></i> 建議節奏：' + escapeHtml(config.studyTime) + "</span>"
        : "",
      config.focus
        ? '            <span class="hub-pill"><i class="fa-solid fa-bullseye"></i> 本頁焦點：' + escapeHtml(config.focus) + "</span>"
        : "",
      "          </div>",
      "        </div>",
      '        <div class="hub-stats">',
      stats
        .map(function(item) {
          return [
            '<div class="hub-stat-card">',
            '<div class="hub-stat-value">' + escapeHtml(item.value) + "</div>",
            '<div class="hub-stat-label">' + escapeHtml(item.label) + "</div>",
            "</div>"
          ].join("");
        })
        .join(""),
      "        </div>",
      "      </div>",
      "    </section>",
      '    <div class="hub-main-grid">',
      '      <div class="hub-column">',
      '        <section class="hub-panel-card hub-panel-card--strong">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-route"></i> 先完成這三件事</h2>',
      '          <ul class="hub-list">' + goals.map(function(item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>",
      "        </section>",
      '        <section class="hub-panel-card" id="pathways">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-layer-group"></i> 推薦學習路徑</h2>',
      '          <div class="hub-card-grid hub-card-grid--two">' + renderCards(pathways, "hub-path-card") + "</div>",
      "        </section>",
      '        <section class="hub-panel-card">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-lightbulb"></i> 引導提問</h2>',
      '          <div class="hub-card-grid">' + renderPrompts(prompts) + "</div>",
      config.quote ? '<p class="hub-quote">' + escapeHtml(config.quote) + "</p>" : "",
      "        </section>",
      "      </div>",
      '      <div class="hub-column">',
      '        <section class="hub-panel-card" id="checklist">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-list-check"></i> 今日任務清單</h2>',
      '          <div class="hub-checklist">' + renderChecklist(checklist) + "</div>",
      '          <div class="hub-progress">',
      '            <div class="hub-progress-header"><span>完成進度</span><span data-progress-label>0 / ' + checklist.length + ' 完成</span></div>',
      '            <div class="hub-progress-track"><div class="hub-progress-fill" data-progress-fill></div></div>',
      "          </div>",
      "        </section>",
      '        <section class="hub-panel-card">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-compass"></i> 可直接前往的資源</h2>',
      '          <div class="hub-card-grid">' + renderCards(resources, "hub-resource-card") + "</div>",
      config.footerNote ? '<p class="hub-footer-note">' + escapeHtml(config.footerNote) + "</p>" : "",
      "        </section>",
      '        <section class="hub-panel-card" id="notes">',
      '          <h2 class="hub-section-title"><i class="fa-solid fa-pen-to-square"></i> 學習筆記</h2>',
      '          <div class="hub-note-box">',
      '            <textarea data-notes placeholder="' + escapeHtml(config.notePrompt || "把今天學到的重點、卡住的地方、下次要追的問題記下來。") + '">' + escapeHtml(state.notes) + "</textarea>',
      '            <div class="hub-note-hint">這份筆記會儲存在你的瀏覽器本機，不會覆蓋其他學科頁面的內容。</div>',
      "          </div>",
      "        </section>",
      "      </div>",
      "    </div>",
      "  </div>",
      "</div>"
    ].join("");

    app.querySelectorAll("[data-check]").forEach(function(input) {
      input.addEventListener("change", function(event) {
        const key = event.target.getAttribute("data-check");
        state.completed[key] = event.target.checked;
        writeState(storageKey, state);
        updateChecklistUI(app, state, checklist.length);
      });
    });

    const notes = app.querySelector("[data-notes]");
    if (notes) {
      notes.addEventListener("input", function(event) {
        state.notes = event.target.value;
        writeState(storageKey, state);
      });
    }

    updateChecklistUI(app, state, checklist.length);
  }

  document.addEventListener("DOMContentLoaded", mountHub);
})();
