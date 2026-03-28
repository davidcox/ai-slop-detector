const vscode = require("vscode");
const { loadRules, scan } = require("../rules/engine.js");
const rulesJson = require("../rules/rules.json");

const SEVERITY_MAP = {
  high: vscode.DiagnosticSeverity.Warning,
  medium: vscode.DiagnosticSeverity.Information,
  low: vscode.DiagnosticSeverity.Hint,
};

let diagnosticCollection;
let rules;

function scanDocument(document) {
  const config = vscode.workspace.getConfiguration("aiSlopDetector");
  if (!config.get("enabled", true)) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  const disabledRules = new Set(config.get("disabledRules", []));
  const activeRules = rules.filter((r) => !disabledRules.has(r.id));

  const text = document.getText();
  const matches = scan(text, activeRules);

  const diagnostics = matches.map((match) => {
    const startPos = document.positionAt(match.start);
    const endPos = document.positionAt(match.end);
    const range = new vscode.Range(startPos, endPos);

    const severity = SEVERITY_MAP[match.severity] ?? vscode.DiagnosticSeverity.Information;

    const diagnostic = new vscode.Diagnostic(range, `${match.ruleName}: ${match.description}`, severity);
    diagnostic.source = "AI Slop Detector";
    diagnostic.code = match.ruleId;
    return diagnostic;
  });

  diagnosticCollection.set(document.uri, diagnostics);
}

function activate(context) {
  rules = loadRules(rulesJson);
  diagnosticCollection = vscode.languages.createDiagnosticCollection("aiSlopDetector");
  context.subscriptions.push(diagnosticCollection);

  // Command: scan active document
  context.subscriptions.push(
    vscode.commands.registerCommand("aiSlopDetector.scan", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        scanDocument(editor.document);
        const count = diagnosticCollection.get(editor.document.uri)?.length ?? 0;
        vscode.window.showInformationMessage(`AI Slop Detector: found ${count} pattern(s).`);
      } else {
        vscode.window.showWarningMessage("AI Slop Detector: no active document.");
      }
    })
  );

  // Command: clear diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand("aiSlopDetector.clear", () => {
      diagnosticCollection.clear();
      vscode.window.showInformationMessage("AI Slop Detector: diagnostics cleared.");
    })
  );

  // Auto-scan on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      scanDocument(document);
    })
  );

  // Auto-scan on document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      scanDocument(document);
    })
  );

  // Scan any already-open documents
  if (vscode.window.activeTextEditor) {
    scanDocument(vscode.window.activeTextEditor.document);
  }
}

function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

module.exports = { activate, deactivate };
