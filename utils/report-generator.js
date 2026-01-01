"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportCollector = void 0;
exports.writeReport = writeReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ReportCollector {
    baseUrl;
    issues = [];
    perf = {};
    screenshots = {};
    startedAt = Date.now();
    context = {};
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    setContext(ctx) {
        this.context = ctx;
    }
    addIssue(issue) {
        this.issues.push(issue);
    }
    addPerfSample(url, sample) {
        this.perf[url] = sample;
    }
    attachScreenshot(url, pathToFile) {
        this.screenshots[url] = pathToFile;
    }
    getReport() {
        const durationMs = Date.now() - this.startedAt;
        const severityOrder = ['critical', 'high', 'medium', 'low'];
        const criticalErrors = this.issues.filter((i) => i.severity === 'critical').length;
        const highErrors = this.issues.filter((i) => i.severity === 'high').length;
        const warnings = this.issues.filter((i) => i.severity === 'medium').length;
        const suggestions = this.issues.filter((i) => i.severity === 'low').length;
        return {
            summary: {
                baseUrl: this.baseUrl,
                totalPages: Object.keys(this.perf).length || 'n/a',
                totalErrors: this.issues.length,
                criticalErrors,
                highErrors,
                warnings,
                suggestions,
                testDurationMs: durationMs,
                timestamp: new Date().toISOString(),
                context: this.context,
            },
            issues: this.issues.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)),
            perf: this.perf,
            screenshots: this.screenshots,
        };
    }
}
exports.ReportCollector = ReportCollector;
async function writeReport(outputDir, collector) {
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    const report = collector.getReport();
    const jsonPath = path_1.default.join(outputDir, 'full-site-report.json');
    fs_1.default.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    const htmlPath = path_1.default.join(outputDir, 'full-site-report.html');
    const html = renderHtml(report);
    fs_1.default.writeFileSync(htmlPath, html, 'utf-8');
}
function renderHtml(report) {
    const { summary, issues } = report;
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Rapport Playwright - ${summary.baseUrl}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; }
    h1 { margin-bottom: 4px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .card { padding: 12px; background: #f5f5f5; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #fafafa; text-align: left; }
    .critical { color: #b00020; font-weight: bold; }
    .high { color: #d95f02; font-weight: bold; }
    .medium { color: #e6a700; }
    .low { color: #467fcf; }
  </style>
</head>
<body>
  <h1>Rapport Playwright</h1>
  <div class="summary">
    <div class="card"><strong>Base URL</strong><br/>${summary.baseUrl}</div>
    <div class="card"><strong>Pages</strong><br/>${summary.totalPages}</div>
    <div class="card"><strong>Erreurs totales</strong><br/>${summary.totalErrors}</div>
    <div class="card"><strong>Critiques</strong><br/>${summary.criticalErrors}</div>
    <div class="card"><strong>Haute</strong><br/>${summary.highErrors}</div>
    <div class="card"><strong>Avertissements</strong><br/>${summary.warnings}</div>
    <div class="card"><strong>Suggestions</strong><br/>${summary.suggestions}</div>
    <div class="card"><strong>Durée</strong><br/>${Math.round(summary.testDurationMs / 1000)}s</div>
  </div>

  <h2>Issues (${issues.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Gravité</th>
        <th>Catégorie</th>
        <th>Page</th>
        <th>Description</th>
        <th>Capture</th>
      </tr>
    </thead>
    <tbody>
      ${issues
        .map((i) => `<tr>
            <td class="${i.severity}">${i.severity}</td>
            <td>${i.category}</td>
            <td><a href="${i.page}" target="_blank" rel="noreferrer">${i.page}</a></td>
            <td>${escapeHtml(i.description)}</td>
            <td>${i.screenshot ? `<a href="${i.screenshot}">screenshot</a>` : ''}</td>
          </tr>`)
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
//# sourceMappingURL=report-generator.js.map