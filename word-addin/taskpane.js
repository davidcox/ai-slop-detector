/* global Word, Office */

// ---- State ----
let compiledRules = null;
let allMatches = []; // flat list: { ruleId, ruleName, severity, matchText, paragraphIndex }
let paragraphTexts = []; // cache of paragraph texts from last scan

// ---- Init ----
Office.onReady(function (info) {
  if (info.host === Office.HostType.Word) {
    compiledRules = SlopEngine.loadRules(SLOP_RULES);
    document.getElementById("btn-scan").addEventListener("click", runScan);
    document.getElementById("btn-clear").addEventListener("click", clearHighlights);
    setStatus("Ready. Click Scan Document to begin.");
  }
});

// ---- Status helpers ----
function setStatus(msg, isError) {
  var bar = document.getElementById("status-bar");
  bar.textContent = msg;
  bar.classList.add("visible");
  bar.classList.toggle("error", !!isError);
}

function clearStatus() {
  var bar = document.getElementById("status-bar");
  bar.classList.remove("visible");
  bar.textContent = "";
}

// ---- Scan ----
function runScan() {
  var scanBtn = document.getElementById("btn-scan");
  scanBtn.disabled = true;
  setStatus("Scanning document...");

  Word.run(function (context) {
    var paragraphs = context.document.body.paragraphs;
    paragraphs.load("text");

    return context.sync().then(function () {
      // Gather text
      allMatches = [];
      paragraphTexts = [];

      for (var i = 0; i < paragraphs.items.length; i++) {
        var text = paragraphs.items[i].text;
        paragraphTexts.push(text);

        if (!text || !text.trim()) continue;

        var hits = SlopEngine.scan(text, compiledRules);
        for (var j = 0; j < hits.length; j++) {
          hits[j].paragraphIndex = i;
          allMatches.push(hits[j]);
        }
      }

      // Summarize and render UI
      var summary = SlopEngine.summarize(allMatches);
      renderSummary(summary);
      renderRulesList(summary);
      setStatus("Scan complete. Found " + summary.total + " hit(s) across " + paragraphs.items.length + " paragraphs.");
      scanBtn.disabled = false;

      // Now highlight in the document
      return highlightMatches(context, paragraphs);
    });
  }).catch(function (error) {
    setStatus("Error: " + error.message, true);
    scanBtn.disabled = false;
  });
}

// ---- Highlight matches in document ----
function highlightMatches(context, paragraphs) {
  // Group matches by paragraph for efficiency
  var byParagraph = {};
  for (var i = 0; i < allMatches.length; i++) {
    var m = allMatches[i];
    if (!byParagraph[m.paragraphIndex]) byParagraph[m.paragraphIndex] = [];
    byParagraph[m.paragraphIndex].push(m);
  }

  var searchPromises = [];

  var indices = Object.keys(byParagraph);
  for (var k = 0; k < indices.length; k++) {
    var pIdx = parseInt(indices[k], 10);
    var matches = byParagraph[pIdx];
    var para = paragraphs.items[pIdx];

    for (var j = 0; j < matches.length; j++) {
      var match = matches[j];
      // Use paragraph.search to find the match text
      var searchText = match.matchText;
      // Word search has a 255 char limit; truncate if needed
      if (searchText.length > 255) searchText = searchText.substring(0, 255);
      // Skip empty or whitespace-only
      if (!searchText.trim()) continue;

      try {
        var searchResults = para.search(searchText, { matchCase: true, matchWholeWord: false });
        searchResults.load("font");
        searchPromises.push({ results: searchResults, severity: match.severity });
      } catch (e) {
        // Some search strings may fail (special chars); skip
      }
    }
  }

  return context.sync().then(function () {
    for (var s = 0; s < searchPromises.length; s++) {
      var entry = searchPromises[s];
      var results = entry.results;
      var color = severityToHighlightColor(entry.severity);
      for (var r = 0; r < results.items.length; r++) {
        results.items[r].font.highlightColor = color;
      }
    }
    return context.sync();
  });
}

function severityToHighlightColor(severity) {
  switch (severity) {
    case "high": return "Yellow";
    case "medium": return "Turquoise";
    case "low": return "LightGray";
    default: return "Yellow";
  }
}

// ---- Clear highlights ----
function clearHighlights() {
  Word.run(function (context) {
    var body = context.document.body;
    body.load("font");
    return context.sync().then(function () {
      body.font.highlightColor = null;
      return context.sync();
    });
  }).then(function () {
    // Reset UI
    document.getElementById("score-panel").classList.remove("visible");
    document.getElementById("rules-list").innerHTML =
      '<div class="empty-state"><div class="icon">&#128070;</div>Hit <strong>Scan Document</strong> to lint for AI writing tells.</div>';
    allMatches = [];
    paragraphTexts = [];
    setStatus("Highlights cleared.");
  }).catch(function (error) {
    setStatus("Error clearing: " + error.message, true);
  });
}

// ---- Navigate to match in document ----
function navigateToMatch(paragraphIndex, matchText) {
  Word.run(function (context) {
    var paragraphs = context.document.body.paragraphs;
    paragraphs.load("text");
    return context.sync().then(function () {
      if (paragraphIndex >= paragraphs.items.length) return context.sync();

      var para = paragraphs.items[paragraphIndex];
      var searchText = matchText;
      if (searchText.length > 255) searchText = searchText.substring(0, 255);
      if (!searchText.trim()) return context.sync();

      var searchResults = para.search(searchText, { matchCase: true, matchWholeWord: false });
      searchResults.load();
      return context.sync().then(function () {
        if (searchResults.items.length > 0) {
          searchResults.items[0].select();
        }
        return context.sync();
      });
    });
  }).catch(function (error) {
    setStatus("Navigation error: " + error.message, true);
  });
}

// ---- Render summary panel ----
function renderSummary(summary) {
  var panel = document.getElementById("score-panel");
  panel.classList.add("visible");

  document.getElementById("total-count").textContent = summary.total;
  document.getElementById("high-count").textContent = summary.high;
  document.getElementById("med-count").textContent = summary.medium;
  document.getElementById("low-count").textContent = summary.low;

  var verdict = document.getElementById("verdict");
  verdict.className = "verdict";
  if (summary.total === 0) {
    verdict.textContent = "Clean";
    verdict.classList.add("verdict-clean");
  } else if (summary.high >= 3 || summary.total >= 8) {
    verdict.textContent = "Likely AI";
    verdict.classList.add("verdict-likely");
  } else {
    verdict.textContent = "Suspicious";
    verdict.classList.add("verdict-suspicious");
  }
}

// ---- Render rules list ----
function renderRulesList(summary) {
  var container = document.getElementById("rules-list");
  container.innerHTML = "";

  if (summary.rules.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">&#10024;</div>No AI patterns detected. Looks clean!</div>';
    return;
  }

  // Sort: high first, then by count desc
  var severityOrder = { high: 0, medium: 1, low: 2 };
  summary.rules.sort(function (a, b) {
    var sevDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    if (sevDiff !== 0) return sevDiff;
    return b.count - a.count;
  });

  for (var i = 0; i < summary.rules.length; i++) {
    var rule = summary.rules[i];

    var item = document.createElement("div");
    item.className = "rule-item " + rule.severity;

    // Find the first match for this rule (for click-to-navigate)
    var firstMatch = null;
    for (var m = 0; m < allMatches.length; m++) {
      if (allMatches[m].ruleId === rule.id) {
        firstMatch = allMatches[m];
        break;
      }
    }

    // Click handler
    (function (fm) {
      item.addEventListener("click", function () {
        if (fm) navigateToMatch(fm.paragraphIndex, fm.matchText);
      });
    })(firstMatch);

    var top = document.createElement("div");
    top.className = "rule-top";
    top.innerHTML = '<span class="rule-name">' + escapeHtml(rule.name) + '</span>' +
      '<span class="rule-count">' + rule.count + '</span>';
    item.appendChild(top);

    var desc = document.createElement("div");
    desc.className = "rule-desc";
    desc.textContent = rule.description;
    item.appendChild(desc);

    if (rule.examples && rule.examples.length > 0) {
      var examples = document.createElement("div");
      examples.className = "rule-examples";
      for (var e = 0; e < rule.examples.length; e++) {
        var code = document.createElement("code");
        code.textContent = truncate(rule.examples[e], 50);
        examples.appendChild(code);
      }
      item.appendChild(examples);
    }

    container.appendChild(item);
  }
}

// ---- Utilities ----
function escapeHtml(text) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len) + "...";
}
