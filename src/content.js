// AI Slop Detector — Content Script
// Scans visible text nodes for common AI writing patterns and highlights them.

(() => {
  "use strict";

  // ── Rule definitions ──────────────────────────────────────────────
  // Each rule: { id, name, description, severity, test }
  // test(text) → array of { start, end } match ranges within the text

  const RULES = [
    // ── Typographic tells ──────────────────────────────────────────
    {
      id: "spaced-emdash",
      name: "Spaced em dash",
      description: "Word — word with spaces around the em dash. Most style guides (AP, Chicago, NYT) use unspaced em dashes; spaced ones are a strong LLM tell.",
      severity: "high",
      pattern: /\w+[\s\u00a0]+[\u2013\u2014][\s\u00a0]+\w+/g,
    },
    {
      id: "double-emdash",
      name: "Double em dash",
      description: "Two em dashes in one sentence — a cadence LLMs love.",
      severity: "medium",
      // match sentences with 2+ em dashes
      pattern: null,
      testFn(text) {
        const hits = [];
        // find sentences (rough split)
        const sentences = text.split(/(?<=[.!?])\s+/);
        let offset = 0;
        for (const s of sentences) {
          const dashes = [...s.matchAll(/[\u2013\u2014]/g)];
          if (dashes.length >= 2) {
            hits.push({ start: offset, end: offset + s.length });
          }
          offset += s.length + (text.slice(offset + s.length).match(/^\s+/) || [""])[0].length;
        }
        return hits;
      },
    },

    // ── Overused words / phrases ───────────────────────────────────
    {
      id: "delve",
      name: '"Delve"',
      description: 'Almost nobody writes "delve" unprompted. Strong AI signal.',
      severity: "high",
      pattern: /\bdelve[sd]?\b/gi,
    },
    {
      id: "tapestry",
      name: '"Tapestry" (metaphorical)',
      description: "LLMs reach for \"tapestry\" as a metaphor far more than humans do.",
      severity: "medium",
      pattern: /\btapestry\b/gi,
    },
    {
      id: "landscape",
      name: '"Landscape" (metaphorical)',
      description: '"The AI landscape," "the competitive landscape" — a go-to filler noun.',
      severity: "low",
      pattern: /\b(?:the\s+)?(?:\w+\s+)?landscape\b/gi,
    },
    {
      id: "leverage-verb",
      name: '"Leverage" as verb',
      description: "Leverage used as a verb is a corporate-AI tell.",
      severity: "medium",
      pattern: /\bleverag(?:e|es|ed|ing)\b/gi,
    },
    {
      id: "robust",
      name: '"Robust"',
      description: "Overrepresented in AI-generated text relative to human writing.",
      severity: "low",
      pattern: /\brobust\b/gi,
    },
    {
      id: "multifaceted",
      name: '"Multifaceted"',
      description: "A favorite padding adjective of language models.",
      severity: "medium",
      pattern: /\bmultifaceted\b/gi,
    },
    {
      id: "comprehensive",
      name: '"Comprehensive"',
      description: "LLMs describe nearly everything as comprehensive.",
      severity: "low",
      pattern: /\bcomprehensive\b/gi,
    },
    {
      id: "crucial-pivotal",
      name: '"Crucial" / "Pivotal"',
      description: "Disproportionately common in AI text as intensifiers.",
      severity: "low",
      pattern: /\b(?:crucial|pivotal)\b/gi,
    },
    {
      id: "realm",
      name: '"Realm"',
      description: '"In the realm of…" — classic LLM filler.',
      severity: "medium",
      pattern: /\brealm\b/gi,
    },
    {
      id: "cutting-edge",
      name: '"Cutting-edge"',
      description: "Hyphenated cliché that AI loves.",
      severity: "low",
      pattern: /\bcutting[- ]edge\b/gi,
    },
    {
      id: "foster",
      name: '"Foster"',
      description: '"Foster innovation," "foster collaboration" — a standout AI verb.',
      severity: "medium",
      pattern: /\bfoster(?:s|ed|ing)?\b/gi,
    },
    {
      id: "underscores",
      name: '"Underscores" (as emphasis verb)',
      description: '"This underscores the importance…" — disproportionately AI.',
      severity: "medium",
      pattern: /\bunderscores?\b/gi,
    },
    {
      id: "navigate",
      name: '"Navigate" (metaphorical)',
      description: '"Navigate challenges," "navigate complexity" — AI filler verb.',
      severity: "low",
      pattern: /\bnavigate[sd]?\b/gi,
    },
    {
      id: "embark",
      name: '"Embark"',
      description: '"Embark on a journey…" — almost a parody of AI writing.',
      severity: "high",
      pattern: /\bembark(?:s|ed|ing)?\b/gi,
    },
    {
      id: "streamline",
      name: '"Streamline"',
      description: "Corporate AI favorite.",
      severity: "low",
      pattern: /\bstreamline[sd]?\b/gi,
    },
    {
      id: "game-changer",
      name: '"Game-changer"',
      description: "AI-favored hype word.",
      severity: "low",
      pattern: /\bgame[- ]changer\b/gi,
    },

    // ── Structural / rhetorical tells ──────────────────────────────
    {
      id: "its-worth-noting",
      name: '"It\'s worth noting"',
      description: "A classic hedge that pads AI paragraphs.",
      severity: "high",
      pattern: /\bit(?:'|'\u2019)s\s+worth\s+noting\b/gi,
    },
    {
      id: "its-important",
      name: '"It\'s important to note"',
      description: "Another hedge; humans rarely write this unprompted.",
      severity: "high",
      pattern: /\bit(?:'|'\u2019)s\s+important\s+to\s+(?:note|remember|recognize|understand)\b/gi,
    },
    {
      id: "in-todays",
      name: '"In today\'s [X]"',
      description: '"In today\'s fast-paced world…" — a quintessential AI opener.',
      severity: "high",
      pattern: /\bin\s+today(?:'|'\u2019)s\s+\w+/gi,
    },
    {
      id: "whether-youre",
      name: '"Whether you\'re [X] or [Y]"',
      description: "A formulaic inclusive-sounding construction AI overuses.",
      severity: "medium",
      pattern: /\bwhether\s+you(?:'|'\u2019)re\b/gi,
    },
    {
      id: "lets-dive",
      name: '"Let\'s dive in"',
      description: "The canonical AI transition phrase.",
      severity: "high",
      pattern: /\blet(?:'|'\u2019)s\s+dive\s+in\b/gi,
    },
    {
      id: "in-conclusion",
      name: '"In conclusion"',
      description: "Rare in natural prose; common in AI-generated articles.",
      severity: "medium",
      pattern: /\bin\s+conclusion\b/gi,
    },
    {
      id: "furthermore-moreover",
      name: '"Furthermore" / "Moreover"',
      description: "Formal conjunctive adverbs overused by AI to chain paragraphs.",
      severity: "low",
      pattern: /\b(?:furthermore|moreover)\b/gi,
    },
    {
      id: "in-the-realm",
      name: '"In the realm of"',
      description: "Formulaic AI opener for a topic sentence.",
      severity: "high",
      pattern: /\bin\s+the\s+realm\s+of\b/gi,
    },
    {
      id: "at-its-core",
      name: '"At its core"',
      description: "AI loves this transition to sound insightful.",
      severity: "medium",
      pattern: /\bat\s+its\s+core\b/gi,
    },
    {
      id: "not-just-but",
      name: '"Not just [X], but [Y]"',
      description: "A rhetorical construction AI leans on heavily.",
      severity: "low",
      pattern: /\bnot\s+just\s+.{1,40}?\s+but\s+/gi,
    },
    {
      id: "exclamation-opener",
      name: "Exclamatory opener",
      description: '"Great question!", "Absolutely!" — chatbot-style enthusiasm.',
      severity: "high",
      pattern: /^(?:Great\s+question|Absolutely|Certainly|Of\s+course)[!.]/gim,
    },

    // ── Patterns from "Field Guide to AI Slop" ────────────────────
    {
      id: "emoji-bullets",
      name: "Emoji bullet points",
      description: "Emoji-prefixed list items in professional prose — a strong AI formatting tell, especially GPT-4o.",
      severity: "high",
      pattern: /^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u2705\u2611\u2714\u{1F4CA}\u{1F4C8}\u{1F4A1}\u{1F680}\u{1F525}\u{1F3AF}\u{1F4DD}\u{1F44D}\u{1F64C}\u270F]\s+\S/gmu,
    },
    {
      id: "heres-the-thing",
      name: '"Here\'s the thing"',
      description: "Unearned profundity — a dramatic narrative-shifting transition AI uses to sound deep.",
      severity: "medium",
      pattern: /\b(?:but\s+)?here(?:'|')s\s+the\s+thing\b/gi,
    },
    {
      id: "everything-changed",
      name: "Dramatic pivot",
      description: '"Something shifted." "Everything changed." — short dramatic sentences AI uses for unearned narrative weight.',
      severity: "medium",
      pattern: /(?:^|\.\s+)(?:Something\s+shifted|Everything\s+changed|That\s+changed\s+everything|Then\s+everything\s+clicked)[.!]/gim,
    },
    {
      id: "as-continues-to",
      name: '"As [X] continues to [Y]"',
      description: "Vapid opener that says nothing. A favorite AI way to start paragraphs.",
      severity: "high",
      pattern: /\bas\s+\w+\s+continues?\s+to\s+\w+/gi,
    },
    {
      id: "at-the-end-of-the-day",
      name: '"At the end of the day"',
      description: "Overused vapid transition — AI reaches for this when summarizing.",
      severity: "medium",
      pattern: /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
    },
    {
      id: "its-not-its",
      name: '"It\'s not X, it\'s Y"',
      description: "Formulaic parallelism AI uses reflexively to sound insightful without saying much.",
      severity: "medium",
      pattern: /\bit(?:'|')s\s+not\s+(?:just\s+)?(?:about\s+)?.{1,30}?[,;]\s*it(?:'|')s\s+/gi,
    },
    {
      id: "the-reality-is",
      name: '"The reality is"',
      description: "Unearned authority transition — AI uses this to pivot to its main point.",
      severity: "medium",
      pattern: /\b(?:the\s+)?reality\s+is\b/gi,
    },
  ];

  // ── Scanning engine ───────────────────────────────────────────────

  function getMatches(text, rule) {
    if (rule.testFn) return rule.testFn(text);
    if (!rule.pattern) return [];
    const hits = [];
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(text)) !== null) {
      hits.push({ start: m.index, end: m.index + m[0].length });
    }
    return hits;
  }

  function scanPage() {
    // Gather visible text from <p>, <li>, <td>, <h1>-<h6>, <span>, <blockquote>, <article>
    const SELECTORS = "p, li, td, th, h1, h2, h3, h4, h5, h6, span, blockquote, article, div.post, div.entry-content, div.article-body, section";
    const allEls = Array.from(document.querySelectorAll(SELECTORS));

    // Keep only innermost matched elements — skip any element that is an
    // ancestor of another matched element, to avoid scanning the same text
    // at multiple nesting levels (e.g. span inside p inside section).
    const hasMatchedDescendant = new Set();
    for (const el of allEls) {
      let parent = el.parentElement;
      while (parent) {
        hasMatchedDescendant.add(parent);
        parent = parent.parentElement;
      }
    }
    const elements = allEls.filter((el) => !hasMatchedDescendant.has(el));

    const results = [];
    const seen = new Set();

    for (const el of elements) {
      const text = el.innerText || "";
      if (text.length < 20) continue;
      if (seen.has(text)) continue;
      seen.add(text);

      for (const rule of RULES) {
        const hits = getMatches(text, rule);
        for (const hit of hits) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            description: rule.description,
            severity: rule.severity,
            matchText: text.slice(hit.start, hit.end),
            context: text.slice(Math.max(0, hit.start - 40), Math.min(text.length, hit.end + 40)),
            element: el,
          });
        }
      }
    }

    return results;
  }

  // ── Highlighting ──────────────────────────────────────────────────

  function highlightMatches(results) {
    // Remove previous highlights
    document.querySelectorAll(".ai-lint-highlight").forEach((el) => el.replaceWith(...el.childNodes));

    // Group results by element to avoid redundant tree walks
    const byElement = new Map();
    for (const r of results) {
      if (!byElement.has(r.element)) byElement.set(r.element, []);
      byElement.get(r.element).push(r);
    }

    for (const [el, hits] of byElement) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      for (const textNode of textNodes) {
        const nodeText = textNode.nodeValue;
        if (!nodeText || nodeText.trim().length < 2) continue;

        for (const hit of hits) {
          const idx = nodeText.indexOf(hit.matchText);
          if (idx === -1) continue;

          const before = nodeText.slice(0, idx);
          const match = nodeText.slice(idx, idx + hit.matchText.length);
          const after = nodeText.slice(idx + hit.matchText.length);

          const span = document.createElement("span");
          span.className = `ai-lint-highlight ai-lint-${hit.severity}`;
          span.setAttribute("data-ai-lint-rule", hit.ruleName);
          span.setAttribute("data-ai-lint-desc", hit.description);
          span.setAttribute("data-ai-lint-rule-id", hit.ruleId);
          span.textContent = match;

          const parent = textNode.parentNode;
          if (before) parent.insertBefore(document.createTextNode(before), textNode);
          parent.insertBefore(span, textNode);
          if (after) parent.insertBefore(document.createTextNode(after), textNode);
          parent.removeChild(textNode);
          break; // move to next text node after mutation
        }
      }
    }
  }

  // ── Tooltip on hover ──────────────────────────────────────────────

  let tooltip = null;

  function initTooltip() {
    tooltip = document.createElement("div");
    tooltip.className = "ai-lint-tooltip";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    document.addEventListener("mouseover", (e) => {
      const hl = e.target.closest(".ai-lint-highlight");
      if (!hl) { tooltip.style.display = "none"; return; }
      const rule = hl.getAttribute("data-ai-lint-rule");
      const desc = hl.getAttribute("data-ai-lint-desc");
      const sev = hl.classList.contains("ai-lint-high") ? "HIGH" : hl.classList.contains("ai-lint-medium") ? "MED" : "LOW";
      tooltip.innerHTML = `<strong>${rule}</strong> <span class="ai-lint-sev ai-lint-sev-${sev.toLowerCase()}">${sev}</span><br>${desc}`;
      tooltip.style.display = "block";
      const rect = hl.getBoundingClientRect();
      tooltip.style.left = rect.left + window.scrollX + "px";
      tooltip.style.top = rect.bottom + window.scrollY + 6 + "px";
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(".ai-lint-highlight")) tooltip.style.display = "none";
    });
  }

  // ── Communication with popup ──────────────────────────────────────

  let lastResults = [];
  let lastSummary = null;

  function buildSummary(results) {
    const summary = {};
    for (const r of results) {
      if (!summary[r.ruleId]) {
        summary[r.ruleId] = { id: r.ruleId, name: r.ruleName, description: r.description, severity: r.severity, count: 0, examples: [] };
      }
      summary[r.ruleId].count++;
      if (summary[r.ruleId].examples.length < 3) {
        summary[r.ruleId].examples.push(r.matchText);
      }
    }
    return {
      total: results.length,
      high: results.filter((r) => r.severity === "high").length,
      medium: results.filter((r) => r.severity === "medium").length,
      low: results.filter((r) => r.severity === "low").length,
      rules: Object.values(summary),
    };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "scan") {
      lastResults = scanPage();
      highlightMatches(lastResults);
      lastSummary = buildSummary(lastResults);
      sendResponse(lastSummary);
    } else if (msg.action === "getResults") {
      sendResponse(lastSummary);
    } else if (msg.action === "scrollTo") {
      const ruleId = CSS.escape(msg.ruleId);
      const highlights = document.querySelectorAll(`.ai-lint-highlight[data-ai-lint-rule-id="${ruleId}"]`);
      if (highlights.length === 0) { sendResponse({ ok: false }); return; }
      const idx = (typeof msg.index === "number" ? msg.index : 0) % highlights.length;
      const el = highlights[idx];
      // Remove previous focus ring from all highlights
      document.querySelectorAll(".ai-lint-focus").forEach((e) => {
        e.classList.remove("ai-lint-focus");
      });
      // Force reflow so the browser restarts the animation
      void el.offsetWidth;
      el.classList.add("ai-lint-focus");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      sendResponse({ ok: true, total: highlights.length, current: idx });
    } else if (msg.action === "clear") {
      document.querySelectorAll(".ai-lint-highlight").forEach((el) => el.replaceWith(...el.childNodes));
      lastResults = [];
      sendResponse({ ok: true });
    }
    return true; // async
  });

  // ── Init ──────────────────────────────────────────────────────────
  initTooltip();
})();
