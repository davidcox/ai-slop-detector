document.getElementById("btn-scan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      document.getElementById("rules-list").innerHTML =
        '<div class="empty-state"><div class="icon">⚠️</div>Could not reach this page.<br>Try reloading, or this page may block extensions.</div>';
      return;
    }
    renderResults(response);
  });
});

document.getElementById("btn-clear").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: "clear" });

  document.getElementById("score-panel").classList.remove("visible");
  document.getElementById("rules-list").innerHTML =
    '<div class="empty-state"><div class="icon">🧹</div>Highlights cleared.</div>';
});

function renderResults({ total, high, medium, low, rules }) {
  // Score panel
  const panel = document.getElementById("score-panel");
  panel.classList.add("visible");
  document.getElementById("total-count").textContent = total;
  document.getElementById("high-count").textContent = high;
  document.getElementById("med-count").textContent = medium;
  document.getElementById("low-count").textContent = low;

  // Verdict
  const verdict = document.getElementById("verdict");
  if (total === 0) {
    verdict.className = "verdict verdict-clean";
    verdict.textContent = "Looks human ✓";
  } else if (high >= 3 || total >= 8) {
    verdict.className = "verdict verdict-likely";
    verdict.textContent = "Likely AI-generated";
  } else if (high >= 1 || total >= 3) {
    verdict.className = "verdict verdict-suspicious";
    verdict.textContent = "Suspicious";
  } else {
    verdict.className = "verdict verdict-clean";
    verdict.textContent = "Probably fine";
  }

  // Rules list
  const list = document.getElementById("rules-list");

  if (rules.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">✨</div>No AI tells found on this page.</div>';
    return;
  }

  // Sort: high first, then by count
  rules.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
    return b.count - a.count;
  });

  list.innerHTML = rules
    .map((r) => {
      const examples = r.examples.map((e) => `<code>${escHtml(e)}</code>`).join(" ");
      return `
      <div class="rule-item ${r.severity}">
        <div class="rule-top">
          <span class="rule-name">${escHtml(r.name)}</span>
          <span class="rule-count">×${r.count}</span>
        </div>
        <div class="rule-desc">${escHtml(r.description)}</div>
        ${examples ? `<div class="rule-examples">${examples}</div>` : ""}
      </div>`;
    })
    .join("");
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
