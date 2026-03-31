# AI Slop Detector — VS Code Extension

Highlights common AI writing patterns ("slop") in Markdown and plain-text files.

## Features

- Underlines AI-typical words and phrases with severity-based diagnostics (Warning, Information, Hint).
- Auto-scans on file open and save.
- Manual scan via the **AI Slop Detector: Scan Document** command.
- Clear all highlights with **AI Slop Detector: Clear Diagnostics**.

## Settings

| Setting                          | Default | Description                              |
|----------------------------------|---------|------------------------------------------|
| `aiSlopDetector.enabled`         | `true`  | Enable or disable scanning               |
| `aiSlopDetector.disabledRules`   | `[]`    | Array of rule IDs to skip                |

## Development

No build step required. The extension uses the shared rule engine at `../rules/engine.js` and rule definitions at `../rules/rules.json`.

To test locally, open this folder in VS Code and press **F5** to launch the Extension Development Host.
