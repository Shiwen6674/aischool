/**
 * vocab-engine.js — 離線詞彙分析引擎
 * 從 Google Sheets 載入已斷好的 CKIP 詞彙表，
 * 使用最長前向匹配對試題文本進行斷詞，
 * 然後比對各詞彙首次出現的年級/學期，算出適切性分數。
 */
(function () {
  "use strict";

  // ========== 常數 ==========
  const SPREADSHEET_ID = "1cEfMEy3bvDa1tET3xmh7ShGeJy8KLUMa_JuULGBD-mk";
  const MAX_WORD_LEN = 10;

  // 需要跳過的 POS（功能詞、標點、代詞、數詞、量詞等）
  const SKIP_POS = new Set([
    "DE","SHI","T","Di","P","FW","I","A",
    "Nh","Neu","Nf","Neqa","Nep","Nes","Ng","Ncd"
  ]);

  const CHEMICAL_ELEMENTS = new Set([
    "H","He","Li","Be","B","C","N","O","F","Ne",
    "Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca",
    "Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn",
    "Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr",
    "Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn",
    "Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd",
    "Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb",
    "Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg",
    "Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th",
    "Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm",
    "Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds",
    "Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"
  ]);
  const COMMON_STANDALONE_ELEMENT_SYMBOLS = new Set([
    "Na","Mg","Al","Si","Cl","Ca","Fe","Cu","Zn","Ag","Au","Hg","Pb"
  ]);
  const SUBSCRIPT_DIGITS = {
    "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄",
    "5":"₅","6":"₆","7":"₇","8":"₈","9":"₉"
  };
  const SUPERSCRIPT_CHARS = {
    "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴",
    "5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹",
    "+":"⁺","-":"⁻"
  };
  const ASCII_DIGITS = {
    "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4",
    "₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
    "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4",
    "⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9"
  };

  // ========== 全域狀態 ==========
  let vocabDB = [];          // 從試算表解析出的所有課文資料
  let allWordSet = new Set(); // 所有不重複的詞彙（用於斷詞字典）
  let allWordPosMap = {};    // word → pos（取首次出現的詞性）
  let loaded = false;
  let loading = false;

  // ========== CKIP 格式解析 ==========
  // 格式：「詞彙(詞性)　詞彙(詞性)　…」，以全形/半形空白或換行分隔
  function parseCkipTokens(text) {
    if (!text || !text.trim()) return [];
    var tokens = [];
    var parts = text.split(/[\s\u3000\n\r]+/);
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/^(.+?)\(([^)]+)\)$/);
      if (m && !m[2].endsWith("CATEGORY")) {
        tokens.push({ word: m[1], pos: m[2] });
      }
    }
    return tokens;
  }

  // ========== 學期編號 ==========
  // 三年級上=1, 三年級下=2, 四年級上=3, ... 九年級下=14
  function gradeToSemNum(grade, semester) {
    var g = parseInt(grade, 10);
    if (isNaN(g)) return 0;
    return (g - 3) * 2 + (semester === "下" ? 2 : 1);
  }

  function semNumToLabel(semNum) {
    var labels = {3:"三",4:"四",5:"五",6:"六",7:"七",8:"八",9:"九"};
    var grade = Math.floor((semNum - 1) / 2) + 3;
    var sem = (semNum % 2 === 1) ? "上" : "下";
    return (labels[grade] || grade) + "年級" + sem;
  }

  // ========== 從 Google Sheets 載入詞彙表 ==========
  function loadVocabDB(onProgress) {
    if (loaded) return Promise.resolve();
    if (loading) return Promise.resolve();
    loading = true;

    var url = "https://docs.google.com/spreadsheets/d/" +
      SPREADSHEET_ID + "/gviz/tq?tqx=out:json&sheet=Sheet1&headers=1";

    if (onProgress) onProgress("connecting");

    return fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        if (onProgress) onProgress("parsing");
        // 提取 JSON（gviz 回應被包在 callback 中）
        var startIdx = text.indexOf("{");
        var endIdx = text.lastIndexOf("}");
        if (startIdx === -1 || endIdx === -1) throw new Error("無法解析試算表回應");
        var data = JSON.parse(text.substring(startIdx, endIdx + 1));
        if (data.status !== "ok") throw new Error("試算表查詢錯誤");
        buildFromGviz(data.table);
        loaded = true;
        loading = false;
        if (onProgress) onProgress("done");
      })
      .catch(function (err) {
        loading = false;
        if (onProgress) onProgress("error");
        throw err;
      });
  }

  function getCellVal(row, colIdx) {
    if (!row.c || !row.c[colIdx]) return "";
    var v = row.c[colIdx].v;
    return (v === null || v === undefined) ? "" : String(v);
  }

  function buildFromGviz(table) {
    // 欄位索引：A=0(中小學), C=2(出版社), D=3(年級), E=4(學期), H=7(課名)
    // CKIP 欄：J=9, L=11, N=13, P=15, R=17
    var ckipCols = [
      { idx: 9, source: "課文" },
      { idx: 11, source: "實作" },
      { idx: 13, source: "圖說" },
      { idx: 15, source: "表" },
      { idx: 17, source: "例題" }
    ];

    vocabDB = [];
    allWordSet = new Set();
    allWordPosMap = {};

    for (var r = 0; r < table.rows.length; r++) {
      var row = table.rows[r];
      var stage = getCellVal(row, 0);
      var publisher = getCellVal(row, 2);
      var grade = getCellVal(row, 3);
      var semester = getCellVal(row, 4);
      var lessonName = getCellVal(row, 7);
      var semNum = gradeToSemNum(grade, semester);
      var allTokens = [];

      for (var c = 0; c < ckipCols.length; c++) {
        var text = getCellVal(row, ckipCols[c].idx);
        var tokens = parseCkipTokens(text);
        for (var t = 0; t < tokens.length; t++) {
          tokens[t].source = ckipCols[c].source;
        }
        allTokens = allTokens.concat(tokens);
      }

      // 建立全域詞彙字典
      for (var t = 0; t < allTokens.length; t++) {
        var w = allTokens[t].word;
        allWordSet.add(w);
        if (!allWordPosMap[w]) {
          allWordPosMap[w] = allTokens[t].pos;
        }
      }

      vocabDB.push({
        stage: stage,
        publisher: publisher,
        grade: grade,
        semester: semester,
        lessonName: lessonName,
        semNum: semNum,
        tokens: allTokens
      });
    }
  }

  // ========== 建立詞彙索引（依篩選條件） ==========
  // 回傳 Map<word, {pos, firstSemNum, firstGrade, firstSemester, firstLesson, firstPublisher, firstSource}>
  function buildVocabIndex(filterPublisher) {
    var index = {};
    for (var r = 0; r < vocabDB.length; r++) {
      var entry = vocabDB[r];
      // 出版社篩選
      if (filterPublisher && entry.publisher !== filterPublisher) continue;
      for (var t = 0; t < entry.tokens.length; t++) {
        var tk = entry.tokens[t];
        var existing = index[tk.word];
        if (!existing || entry.semNum < existing.firstSemNum) {
          index[tk.word] = {
            pos: tk.pos,
            firstSemNum: entry.semNum,
            firstGrade: entry.grade,
            firstSemester: entry.semester,
            firstLesson: entry.lessonName,
            firstPublisher: entry.publisher,
            firstSource: tk.source
          };
        }
      }
    }
    return index;
  }

  // ========== 最長前向匹配斷詞 ==========
  function segmentText(text) {
    var result = [];
    var i = 0;
    while (i < text.length) {
      var matched = false;
      var maxLen = Math.min(MAX_WORD_LEN, text.length - i);
      for (var len = maxLen; len >= 2; len--) {
        var candidate = text.substring(i, i + len);
        if (allWordSet.has(candidate)) {
          result.push({ word: candidate, matched: true });
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        var ch = text[i];
        result.push({ word: ch, matched: allWordSet.has(ch) });
        i++;
      }
    }
    return result;
  }

  // ========== 詞性分類與篩選 ==========
  function getPosCategory(pos) {
    if (!pos) return null;
    if (pos.endsWith("CATEGORY")) return null;
    if (SKIP_POS.has(pos)) return null;
    if (pos.startsWith("N")) return "N";
    if (pos === "VH" || pos === "VHC") return "A";
    if (pos.startsWith("V")) return "V";
    if (pos.startsWith("D")) return "D";
    if (pos.startsWith("C")) return "C";
    return "O";
  }

  function shouldShowWord(pos, selectedCategories) {
    var cat = getPosCategory(pos);
    if (!cat) return false;
    if (cat === "A") {
      return selectedCategories.has("A") || selectedCategories.has("V");
    }
    return selectedCategories.has(cat);
  }

  // ========== 判斷是否為非中文字元 ==========
  function isNonChinese(word) {
    return !/[\u4e00-\u9fff\u3400-\u4dbf]/.test(word);
  }

  // ========== 科學式正式寫法 ==========
  function normalizeFormulaAscii(value) {
    return String(value || "")
      .replace(/[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (ch) {
        return ASCII_DIGITS[ch] || ch;
      })
      .replace(/[⁺＋]/g, "+")
      .replace(/[⁻−－–—]/g, "-")
      .replace(/[→➜⟶]/g, "→")
      .replace(/->/g, "→")
      .trim();
  }

  function toSubscript(value) {
    return String(value || "").replace(/[0-9]/g, function (d) {
      return SUBSCRIPT_DIGITS[d] || d;
    });
  }

  function toSuperscript(value) {
    return String(value || "").replace(/[0-9+\-]/g, function (d) {
      return SUPERSCRIPT_CHARS[d] || d;
    });
  }

  function splitChemicalToken(token) {
    var raw = normalizeFormulaAscii(token).replace(/\s+/g, "");
    var coefficient = "";
    var coefficientMatch = raw.match(/^(\d+)(?=[A-Z(])/);
    if (coefficientMatch) {
      coefficient = coefficientMatch[1];
      raw = raw.slice(coefficient.length);
    }

    var charge = "";
    var chargeMatch = raw.match(/\^?(\d*)([+-])$/);
    if (chargeMatch) {
      charge = (chargeMatch[1] || "") + chargeMatch[2];
      raw = raw.slice(0, raw.length - chargeMatch[0].length);
    }

    return { coefficient: coefficient, body: raw, charge: charge };
  }

  function parseChemicalBody(body) {
    var index = 0;
    var elementCount = 0;
    var hasSubscript = false;
    while (index < body.length) {
      var groupStart = body[index];
      if (groupStart === "(" || groupStart === ")") {
        index++;
        while (/[0-9]/.test(body[index] || "")) {
          hasSubscript = true;
          index++;
        }
        continue;
      }

      var m = body.slice(index).match(/^([A-Z][a-z]?)(\d*)/);
      if (!m) return null;
      if (!CHEMICAL_ELEMENTS.has(m[1])) return null;
      elementCount++;
      if (m[2]) hasSubscript = true;
      index += m[0].length;
    }
    return { elementCount: elementCount, hasSubscript: hasSubscript };
  }

  function isChemicalFormulaToken(token) {
    var parts = splitChemicalToken(token);
    if (!parts.body) return false;
    var parsed = parseChemicalBody(parts.body);
    if (!parsed) return false;
    if (parts.charge) return true;
    if (parsed.hasSubscript) return true;
    if (parsed.elementCount >= 2) return true;
    return COMMON_STANDALONE_ELEMENT_SYMBOLS.has(parts.body);
  }

  function formatChemicalToken(token) {
    if (!isChemicalFormulaToken(token)) return token;
    var parts = splitChemicalToken(token);
    var body = parts.body
      .replace(/([A-Z][a-z]?)(\d+)/g, function (_, element, digits) {
        return element + toSubscript(digits);
      })
      .replace(/(\))(\d+)/g, function (_, closeParen, digits) {
        return closeParen + toSubscript(digits);
      });
    return parts.coefficient + body + (parts.charge ? toSuperscript(parts.charge) : "");
  }

  function formatScientificNotationText(value) {
    var text = normalizeFormulaAscii(value);
    if (!text) return "";
    text = text.replace(/([A-Za-z0-9₀-₉])\+(?=[A-Z0-9])/g, "$1 + ");
    text = text.replace(/\s*→\s*/g, " → ");
    return text.replace(/(?:\d*)?(?:[A-Z][a-z]?\d*){1,}(?:\^\d*[+-]|\d*[+-])?/g, function (token, offset, source) {
      if (!isChemicalFormulaToken(token)) return token;
      var next = source[offset + token.length] || "";
      if (/[A-Za-z0-9]/.test(next) && /[+-]$/.test(token)) return token;
      return formatChemicalToken(token);
    }).replace(/\s{2,}/g, " ").trim();
  }

  function addUniqueScientificNotation(rows, seen, rawTerm, pos, firstLabel) {
    var raw = String(rawTerm || "").trim();
    if (!raw) return;
    var display = formatScientificNotationText(raw);
    var key = display || raw;
    if (!key || seen[key] || seen[raw]) return;
    var needsFormalNotation = display && display !== raw;
    seen[key] = true;
    seen[raw] = true;
    rows.push({
      term: raw,
      displayTerm: display,
      pos: pos,
      first: needsFormalNotation
        ? firstLabel + "；建議改為「" + display + "」"
        : firstLabel,
      diff: 0,
      state: needsFormalNotation ? "notation_warn" : "fit",
      isScientificNotation: true,
      needsFormalNotation: needsFormalNotation
    });
  }

  function extractScientificNotations(text) {
    var source = String(text || "");
    var normalized = normalizeFormulaAscii(source)
      .replace(/([A-Za-z0-9₀-₉])\+(?=[A-Z0-9])/g, "$1 + ");
    var rows = [];
    var seen = {};

    var chemicalRegex = /(?:\d*)?(?:[A-Z][a-z]?\d*){1,}(?:\^\d*[+-]|\d*[+-])?/g;
    var match;
    while ((match = chemicalRegex.exec(normalized)) !== null) {
      var token = match[0];
      if (isChemicalFormulaToken(token)) {
        addUniqueScientificNotation(rows, seen, token, "化學式", "正式化學式／元素符號");
      }
    }

    var spacedChargeRegex = /(?:[A-Z][a-z]?\d*){1,}\s+\d+[+-]/g;
    while ((match = spacedChargeRegex.exec(normalized)) !== null) {
      var spacedToken = match[0].replace(/\s+/g, "^");
      if (isChemicalFormulaToken(spacedToken)) {
        addUniqueScientificNotation(rows, seen, spacedToken, "化學式", "正式化學式／離子符號");
      }
    }

    var formulaRegex = /(?:F\s*=\s*ma|ρ\s*=\s*m\s*(?:÷|\/)\s*V|v\s*=\s*Δx\s*(?:÷|\/)\s*Δt|E\s*=\s*mc\^?2)/gi;
    while ((match = formulaRegex.exec(normalized)) !== null) {
      addUniqueScientificNotation(rows, seen, match[0], "公式", "正式科學公式");
    }

    return rows;
  }

  // ========== 主要分析函式 ==========
  // options: { text, targetSemNum, filterPublisher, posFilter: Set }
  // 回傳: { summary: {score, total, safe, risk, scoreFormula}, table: [{term,pos,first,diff,state}] }
  function analyze(options) {
    var text = options.text;
    var targetSemNum = options.targetSemNum;
    var filterPublisher = options.filterPublisher || "";
    var posFilter = options.posFilter;

    // 1. 建立索引
    var vocabIndex = buildVocabIndex(filterPublisher);

    // 2. 斷詞
    var segments = segmentText(text);

    // 3. 去重 + 篩選
    var seen = {};
    var tableRows = extractScientificNotations(text);
    for (var s = 0; s < tableRows.length; s++) {
      seen[tableRows[s].term] = true;
      if (tableRows[s].displayTerm) seen[tableRows[s].displayTerm] = true;
    }
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (isNonChinese(seg.word)) continue;
      if (seg.word.length < 1) continue;
      if (seen[seg.word]) continue;
      seen[seg.word] = true;

      var info = vocabIndex[seg.word];
      var pos = info ? info.pos : (allWordPosMap[seg.word] || null);

      // POS 篩選
      if (!shouldShowWord(pos, posFilter)) continue;

      var diff, state, firstLabel;
      if (info) {
        diff = targetSemNum - info.firstSemNum;
        if (diff >= 0) {
          state = "fit";
        } else if (diff === -1) {
          state = "next_sem";
        } else {
          state = "risk";
        }
        var gl = {3:"三",4:"四",5:"五",6:"六",7:"七",8:"八",9:"九"};
        firstLabel = info.firstPublisher + " " +
          (gl[info.firstGrade] || info.firstGrade) + "年級" + info.firstSemester +
          " " + info.firstLesson + " (" + info.firstSource + ")";
      } else {
        diff = -100;
        state = "not_found";
        firstLabel = "未見於資料庫";
      }

      tableRows.push({
        term: seg.word,
        pos: pos || "?",
        first: firstLabel,
        diff: diff,
        state: state
      });
    }

    // 4. 計算分數
    var total = tableRows.length;
    var safe = 0, risk = 0;
    var penalties = [];
    for (var j = 0; j < tableRows.length; j++) {
      var row = tableRows[j];
      if (row.state === "fit") {
        safe++;
      } else {
        risk++;
        if (row.state === "notation_warn") {
          continue;
        }
        if (row.diff > -100) {
          penalties.push({ term: row.displayTerm || row.term, val: Math.abs(row.diff) });
        } else {
          penalties.push({ term: row.displayTerm || row.term, val: 3 }); // 未見詞扣 3 學期
        }
      }
    }

    var penaltySum = 0;
    var formulaParts = [];
    for (var k = 0; k < penalties.length; k++) {
      penaltySum += penalties[k].val * 2;
      formulaParts.push(penalties[k].term + ":" + penalties[k].val + "×2");
    }
    var score = Math.max(0, 100 - penaltySum);
    var scoreFormula = penalties.length > 0
      ? "100 - (" + formulaParts.join(" + ") + ") = " + score
      : "100（無扣分）";

    return {
      summary: {
        score: score,
        total: total,
        safe: safe,
        risk: risk,
        scoreFormula: scoreFormula
      },
      table: tableRows
    };
  }

  // ========== 公開 API ==========
  window.VocabEngine = {
    loadVocabDB: loadVocabDB,
    analyze: analyze,
    formatScientificNotationText: formatScientificNotationText,
    isLoaded: function () { return loaded; },
    gradeToSemNum: gradeToSemNum,
    semNumToLabel: semNumToLabel,
    getVocabDB: function () { return vocabDB; }
  };
})();
