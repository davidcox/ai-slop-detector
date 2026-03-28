---
name: New rule proposal
about: Suggest a new AI writing pattern to detect
title: 'Rule: [pattern name]'
labels: new-rule
---

## Pattern

What word, phrase, or structural pattern should be detected?

## Examples

Paste 2–3 examples of AI-generated text exhibiting this pattern:

1.
2.
3.

## Why it's an AI tell

Why does this pattern appear more frequently in AI output than in human writing?

## False positive risk

How often does this pattern appear in normal human writing? (high / medium / low)

## Suggested severity

- [ ] High — strong signal on its own
- [ ] Medium — suggestive, especially in combination
- [ ] Low — weak individually, but accumulates

## Proposed regex (optional)

```javascript
/\byour pattern here\b/gi
```
