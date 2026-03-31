// AI Slop Detector — Shared matching engine
// Isomorphic: works in browser, Node.js, VS Code, and Office Add-ins.
// No DOM or platform-specific APIs — text in, data out.

const CUSTOM_HANDLERS = {
  doubleEmdash(text) {
    const hits = [];
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
};

function loadRules(rulesJson) {
  return rulesJson.map((r) => {
    const compiled = { ...r };
    if (r.pattern) {
      compiled.regex = new RegExp(r.pattern, r.flags || "g");
    }
    if (r.customHandler && CUSTOM_HANDLERS[r.customHandler]) {
      compiled.testFn = CUSTOM_HANDLERS[r.customHandler];
    }
    return compiled;
  });
}

function getMatches(text, rule) {
  if (rule.testFn) return rule.testFn(text);
  if (!rule.regex) return [];
  const hits = [];
  rule.regex.lastIndex = 0;
  let m;
  while ((m = rule.regex.exec(text)) !== null) {
    hits.push({ start: m.index, end: m.index + m[0].length });
  }
  return hits;
}

function scan(text, rules) {
  const results = [];
  for (const rule of rules) {
    const hits = getMatches(text, rule);
    for (const hit of hits) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        severity: rule.severity,
        start: hit.start,
        end: hit.end,
        matchText: text.slice(hit.start, hit.end),
      });
    }
  }
  return results;
}

function summarize(matches) {
  const summary = {};
  for (const r of matches) {
    if (!summary[r.ruleId]) {
      summary[r.ruleId] = { id: r.ruleId, name: r.ruleName, description: r.description, severity: r.severity, count: 0, examples: [] };
    }
    summary[r.ruleId].count++;
    if (summary[r.ruleId].examples.length < 3) {
      summary[r.ruleId].examples.push(r.matchText);
    }
  }
  return {
    total: matches.length,
    high: matches.filter((r) => r.severity === "high").length,
    medium: matches.filter((r) => r.severity === "medium").length,
    low: matches.filter((r) => r.severity === "low").length,
    rules: Object.values(summary),
  };
}

// Support both CJS and ESM
if (typeof module !== "undefined" && module.exports) {
  module.exports = { loadRules, scan, summarize, getMatches };
}
if (typeof globalThis !== "undefined") {
  globalThis.SlopEngine = { loadRules, scan, summarize, getMatches };
}
