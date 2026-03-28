# AI Slop Detector — Word Add-in

A Microsoft Word Office Web Add-in that scans documents for AI writing patterns ("slop") using a shared rule set.

## Prerequisites

- Microsoft Word (desktop or Word Online)
- A local HTTPS server to serve the add-in files (e.g., `http-server`, `serve`, or `office-addin-dev-certs` + any static server)
- Node.js (for running the local server)

## Quick Setup

### 1. Install a local HTTPS server

```bash
npm install -g office-addin-dev-certs http-server
```

### 2. Generate dev certificates

```bash
npx office-addin-dev-certs install
```

This creates trusted self-signed certificates for `localhost`.

### 3. Serve the add-in files

From the `word-addin/` directory:

```bash
npx http-server -S -C ~/.office-addin-dev-certs/localhost.crt -K ~/.office-addin-dev-certs/localhost.key -p 3000
```

The add-in expects to be served from `https://localhost:3000`.

### 4. Create placeholder icons

The manifest references icon files. Create an `assets/` folder with placeholder PNGs:

```bash
mkdir -p assets
# Place icon-16.png, icon-32.png, icon-64.png, and icon-80.png in assets/
```

You can use any 16x16, 32x32, 64x64, and 80x80 PNG files.

### 5. Sideload the add-in

#### Word Desktop (Windows)

1. Open Word
2. Go to **File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs**
3. Or use the simpler method: **Insert > My Add-ins > Upload My Add-in**
4. Browse to `manifest.xml` and upload it

#### Word Desktop (Mac)

1. Open Word
2. Go to **Insert > Add-ins > My Add-ins**
3. Click the dropdown arrow, select **Upload My Add-in**
4. Browse to `manifest.xml`

#### Word Online

1. Go to https://www.office.com and open Word
2. Go to **Insert > Office Add-ins > Upload My Add-in**
3. Browse to `manifest.xml` and upload it

#### Using the Office Add-in CLI (any platform)

```bash
npm install -g @microsoft/office-addin-dev-settings
npx office-addin-dev-settings sideload manifest.xml
```

## Usage

1. After sideloading, find **Scan for AI Slop** in the **Review** tab on the ribbon
2. Click it to open the task pane sidebar
3. Click **Scan Document** to analyze the document
4. The sidebar shows:
   - Total hits with severity breakdown (high / medium / low)
   - A verdict: Clean, Suspicious, or Likely AI
   - A list of triggered rules with match counts and examples
5. Matches are highlighted in the document:
   - **Yellow** = high severity
   - **Turquoise** = medium severity
   - **Light Gray** = low severity
6. Click any rule in the sidebar to jump to its first match in the document
7. Click **Clear** to remove all highlights

## File Structure

```
word-addin/
  manifest.xml      — Office Add-in manifest (sideload this)
  taskpane.html      — Task pane UI (loads Office.js, engine, rules)
  taskpane.css       — Dark theme styles
  taskpane.js        — Add-in logic (scan, highlight, navigate)
  README.md          — This file
```

The shared detection engine (`rules/engine.js`) and rule definitions (`rules/rules.json`) are inlined directly in `taskpane.html` via script tags, so no build step is required.

## Development Notes

- No webpack, TypeScript, or build step required
- Plain HTML/JS/CSS served as static files
- The engine and rules are embedded inline in `taskpane.html`
- Edit `../rules/rules.json` to add or modify detection rules
- If you change `rules.json` or `engine.js`, update the inline copies in `taskpane.html`
