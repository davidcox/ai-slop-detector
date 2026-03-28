# 🔬 AI Slop Detector

A browser extension that highlights common AI writing patterns — spaced em dashes, "delve," hedging phrases, and other tells — directly on any web page you're reading.

> **Full disclosure:** This extension was written entirely by an AI. Yes, we know. The irony is not lost on us. If you find tells in *this* README, consider it a integration test.

---

## What it does

Click the extension icon, hit **Scan Page**, and every detected AI-ism gets highlighted inline with color-coded severity. Hover any highlight for a tooltip explaining the rule. The popup summarizes the findings and renders a verdict.

This is **not** an ML classifier. There's no server, no account, no API call. It's a simple rule-based linter that runs locally in your browser. It can't tell you whether something was written by AI — it can only show you the patterns that correlate with AI output at higher-than-human rates.

Think of it as a code linter, but for prose.

## Why rule-based?

ML-based AI detectors (GPTZero, Copyleaks, etc.) give you a probability score but can't explain *why*. They're black boxes. They also require sending text to a server and often cost money.

This extension does the opposite:

- **Transparent.** Every rule is a named pattern with a plain-English description of why it's suspicious.
- **Local.** Nothing leaves your browser. Ever.
- **Educational.** You learn what the tells are instead of trusting a number.
- **Free.** Obviously.

The tradeoff is that it's easy to fool and easy to trigger on human writing. That's fine. It's a reading aid, not a courtroom exhibit.

## Rules (27)

### High severity — strong signals

| Rule | What it catches |
|------|----------------|
| Spaced em dash | `word — word` (most style guides use unspaced) |
| "Delve" | Almost nobody writes this unprompted |
| "Embark" | "Embark on a journey…" |
| "It's worth noting" | Classic AI hedge |
| "It's important to note" | Ditto |
| "In today's [X]" | "In today's fast-paced world…" |
| "Let's dive in" | The canonical AI transition |
| "In the realm of" | Formulaic topic opener |
| Exclamatory opener | "Great question!", "Absolutely!" |

### Medium severity — suggestive

| Rule | What it catches |
|------|----------------|
| Double em dash | Two em dashes in one sentence |
| "Tapestry" (metaphorical) | LLM-favorite metaphor |
| "Leverage" as verb | Corporate-AI tell |
| "Multifaceted" | Padding adjective |
| "Realm" | Filler noun |
| "Foster" | "Foster innovation…" |
| "Underscores" | "This underscores the importance…" |
| "Whether you're" | Formulaic inclusive construction |
| "In conclusion" | Rare in natural prose |
| "At its core" | AI transition to sound insightful |

### Low severity — weak individually, accumulate

| Rule | What it catches |
|------|----------------|
| "Landscape" (metaphorical) | "The AI landscape…" |
| "Robust" | Overrepresented in AI text |
| "Comprehensive" | AI describes everything as comprehensive |
| "Crucial" / "Pivotal" | Disproportionate AI intensifiers |
| "Cutting-edge" | Hyphenated cliché |
| "Streamline" | Corporate AI favorite |
| "Navigate" (metaphorical) | "Navigate challenges…" |
| "Game-changer" | Hype word |
| "Furthermore" / "Moreover" | Formal conjunctive adverbs |
| "Not just X, but Y" | Overused rhetorical construction |

## Install

### From source (developer mode)

```bash
# Clone and build
git clone https://github.com/YOUR_USERNAME/ai-slop-detector.git
cd ai-slop-detector
npm run build

# Then in your browser:
# Chrome:  chrome://extensions → Enable Developer Mode → Load unpacked → select dist/
# Firefox: about:debugging → This Firefox → Load Temporary Add-on → select dist/manifest.json
# Edge:    edge://extensions → Enable Developer Mode → Load unpacked → select dist/
```

### From a release zip

Download the latest `.zip` from [Releases](https://github.com/YOUR_USERNAME/ai-slop-detector/releases), unzip it, and load unpacked as above.

## Development

```bash
npm install          # Install dev dependencies (just zip tooling)
npm run build        # Copy src/ → dist/, ready to load
npm run package      # Build + create ai-slop-detector.zip for distribution
npm run clean        # Remove dist/ and zip artifacts
npm run watch        # Rebuild on file changes (requires fswatch or similar)
```

The source lives in `src/`. There's no transpilation, no bundler, no framework — it's vanilla JS and CSS that runs directly in the browser. The "build" step is just copying files into `dist/` so you have a clean directory to point the browser at.

### Adding a rule

Rules live in `src/content.js` in the `RULES` array. Each rule is an object:

```javascript
{
  id: "my-new-rule",           // kebab-case identifier
  name: '"My phrase"',          // display name for popup/tooltip
  description: "Why this is suspicious.",
  severity: "high",             // "high" | "medium" | "low"
  pattern: /\bmy phrase\b/gi,   // regex — set global flag
}
```

For rules that need more logic than a single regex, use `testFn` instead of `pattern`:

```javascript
{
  id: "complex-rule",
  name: "Complex rule",
  description: "Needs custom logic.",
  severity: "medium",
  pattern: null,
  testFn(text) {
    // Return array of { start, end } match ranges
    return [];
  },
}
```

## Project structure

```
ai-slop-detector/
├── src/
│   ├── manifest.json      # Chrome Extension Manifest V3
│   ├── content.js          # Detection rules + DOM scanning + highlighting
│   ├── content.css         # Highlight + tooltip styles
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic + message passing
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── scripts/
│   └── build.sh            # Build + package script
├── package.json
├── LICENSE
└── README.md
```

## Limitations

- **High false-positive rate.** Human writers use em dashes, say "robust," and write "in conclusion." A single hit means nothing. Look at the pattern of accumulation.
- **English only.** The rules are English-language patterns.
- **No context awareness.** It doesn't know if "landscape" is literal (a painting) or metaphorical (the AI landscape). It flags both.
- **Static scan.** It scans on button press. Dynamically loaded content (infinite scroll, SPAs) may need a re-scan.
- **Content scripts can't reach everything.** Browser-internal pages (`chrome://`, `about:`, PDFs) are off limits.

## Prior art and further reading

- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Signs_of_AI_writing) — the canonical reference
- [blader/humanizer](https://github.com/blader/humanizer) — Claude Code skill that detects and fixes AI patterns
- ["Tells beyond the em dash"](https://aiforlifelonglearners.substack.com/p/tells-beyond-the-em-dash) — great catalogue of structural tells
- ["Why do AI models use so many em-dashes?"](https://www.seangoedecke.com/em-dashes/) — Sean Goedecke's analysis of the training data origins
- ["The Ten Telltale Signs of AI-Generated Text"](https://www.theaugmentededucator.com/p/the-ten-telltale-signs-of-ai-generated) — covers vocabulary, structure, and rhetorical patterns

## Contributing

PRs welcome, especially for new rules. If you've noticed an AI writing pattern that isn't covered, open an issue with examples.

Please test new rules against both AI-generated and human-written text to assess false-positive rates. A rule that fires on every New Yorker article is not useful.

## License

MIT
