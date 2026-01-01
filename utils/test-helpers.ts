import fs from 'fs';
import path from 'path';
import { Page, Response } from '@playwright/test';
import { ReportCollector, Issue } from './report-generator';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category =
  | 'navigation'
  | 'performance'
  | 'accessibility'
  | 'security'
  | 'visual'
  | 'form'
  | 'network'
  | 'seo'
  | 'javascript';

export interface SiteTestConfig {
  baseUrl: string;
  maxPages: number;
  delayMsBetweenRequests: number;
  excludePatterns: RegExp[];
  sameOriginOnly: boolean;
  viewports: { width: number; height: number; label: string }[];
  screenshotOnIssue: boolean;
}

export function buildDefaultConfig(): SiteTestConfig {
  const excludeRaw = process.env.EXCLUDE_PATTERNS || '/admin,/api,/static,/favicon';
  const excludePatterns = excludeRaw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => new RegExp(p.replace(/\*/g, '.*'), 'i'));

  return {
    baseUrl: process.env.SITE_BASE_URL || 'http://localhost:3000',
    maxPages: Number(process.env.SITE_MAX_PAGES || 50),
    delayMsBetweenRequests: Number(process.env.SITE_DELAY_MS || 250),
    sameOriginOnly: process.env.SITE_SAME_ORIGIN !== 'false',
    excludePatterns,
    viewports: [
      { width: 1280, height: 720, label: 'desktop' },
      { width: 768, height: 1024, label: 'tablet' },
      { width: 390, height: 844, label: 'mobile' },
    ],
    screenshotOnIssue: process.env.SITE_SCREENSHOT_ON_ISSUE !== 'false',
  };
}

export async function pauseBetweenRequests(config: SiteTestConfig): Promise<void> {
  if (config.delayMsBetweenRequests > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.delayMsBetweenRequests));
  }
}

function normalizeUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function shouldExclude(url: string, config: SiteTestConfig): boolean {
  return config.excludePatterns.some((re) => re.test(url));
}

export async function extractLinks(page: Page, config: SiteTestConfig): Promise<string[]> {
  const anchors = await page.$$eval('a[href]', (els) => els.map((el) => (el as HTMLAnchorElement).href));
  const unique = new Set<string>();

  for (const href of anchors) {
    const normalized = normalizeUrl(href, config.baseUrl);
    if (!normalized) continue;
    if (shouldExclude(normalized, config)) continue;
    if (config.sameOriginOnly && new URL(normalized).origin !== new URL(config.baseUrl).origin) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
}

export async function crawlSite(page: Page, config: SiteTestConfig, collector: ReportCollector): Promise<string[]> {
  const visited = new Set<string>();
  const queue: string[] = [config.baseUrl];

  while (queue.length && visited.size < config.maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const response = await page.goto(current, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response) {
        collector.addIssue({
          severity: 'high',
          category: 'navigation',
          page: current,
          description: 'Navigation sans réponse (response null)',
        });
      } else if (response.status() >= 400) {
        collector.addIssue({
          severity: 'high',
          category: 'network',
          page: current,
          description: `Code HTTP ${response.status()} lors du crawl`,
        });
      }
    } catch (err: any) {
      collector.addIssue({
        severity: 'high',
        category: 'navigation',
        page: current,
        description: `Erreur lors du crawl: ${err?.message || err}`,
        stackTrace: err?.stack,
      });
      continue;
    }

    const links = await extractLinks(page, config);
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link) && visited.size + queue.length < config.maxPages) {
        queue.push(link);
      }
    }
  }

  return Array.from(visited);
}

export async function inspectPage(
  page: Page,
  url: string,
  config: SiteTestConfig,
  collector: ReportCollector,
): Promise<void> {
  const issues: Issue[] = [];
  const consoleErrors: Issue[] = [];

  const onConsole = (msg: any) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleErrors.push({
        severity: msg.type() === 'error' ? 'high' : 'medium',
        category: 'javascript',
        page: url,
        description: `[console ${msg.type()}] ${msg.text()}`,
      });
    }
  };
  const onPageError = (err: Error) => {
    consoleErrors.push({
      severity: 'high',
      category: 'javascript',
      page: url,
      description: `Erreur JS: ${err.message}`,
      stackTrace: err.stack,
    });
  };
  const onRequestFailed = (request: any) => {
    issues.push({
      severity: 'high',
      category: 'network',
      page: url,
      description: `Requête échouée: ${request.url()} (${request.failure()?.errorText || 'unknown'})`,
    });
  };
  const onResponse = (response: Response) => {
    const status = response.status();
    if (status >= 400) {
      issues.push({
        severity: status >= 500 ? 'critical' : 'high',
        category: 'network',
        page: url,
        description: `Réponse HTTP ${status} pour ${response.url()}`,
      });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Visual / images cassées
    const brokenImages = await page.$$eval('img', (imgs) =>
      imgs
        .filter((img) => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalWidth === 0)
        .map((img) => (img as HTMLImageElement).src),
    );
    if (brokenImages.length) {
      issues.push({
        severity: 'medium',
        category: 'visual',
        page: url,
        description: `Images cassées: ${brokenImages.slice(0, 5).join(', ')}`,
      });
    }

    // Accessibilité basique
    const missingAlt = await page.$$eval('img', (imgs) =>
      imgs.filter((img) => !(img as HTMLImageElement).getAttribute('alt')).length,
    );
    if (missingAlt > 0) {
      issues.push({
        severity: 'medium',
        category: 'accessibility',
        page: url,
        description: `${missingAlt} image(s) sans attribut alt`,
        recommendation: 'Ajouter un alt descriptif sur chaque image.',
      });
    }

    const missingH1 = await page.$$('h1');
    if (missingH1.length === 0) {
      issues.push({
        severity: 'low',
        category: 'seo',
        page: url,
        description: 'Pas de balise H1 trouvée',
      });
    }

    // Formulaires
    const formsInfo = await page.$$eval('form', (forms) =>
      forms.map((form) => {
        const required = Array.from(form.querySelectorAll('[required]')).length;
        const inputs = Array.from(form.querySelectorAll('input, textarea, select')).length;
        return { action: (form as HTMLFormElement).action, required, inputs };
      }),
    );
    if (formsInfo.length) {
      formsInfo.forEach((form) => {
        if (!form.action) {
          issues.push({
            severity: 'low',
            category: 'form',
            page: url,
            description: 'Formulaire sans action définie',
          });
        }
        if (form.required === 0 && form.inputs > 0) {
          issues.push({
            severity: 'low',
            category: 'form',
            page: url,
            description: 'Formulaire sans champs requis détectés (vérifier la validation côté client)',
          });
        }
      });
    }

    // Performance (navigation)
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return null;
      return {
        ttfb: nav.responseStart - nav.requestStart,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        load: nav.loadEventEnd - nav.startTime,
      };
    });
    if (perf) {
      if (perf.load > 4000) {
        issues.push({
          severity: 'medium',
          category: 'performance',
          page: url,
          description: `Temps de chargement élevé (${Math.round(perf.load)} ms)`,
        });
      }
      collector.addPerfSample(url, perf);
    }
  } catch (err: any) {
    issues.push({
      severity: 'critical',
      category: 'navigation',
      page: url,
      description: `Navigation échouée: ${err?.message || err}`,
      stackTrace: err?.stack,
    });
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }

  // Ajout des problèmes collectés
  [...issues, ...consoleErrors].forEach((issue) => {
    collector.addIssue({ ...issue, page: url });
  });

  // Capture d'écran optionnelle si des issues
  if (config.screenshotOnIssue && issues.length) {
    const folder = path.join(process.cwd(), 'test-results', 'screenshots');
    fs.mkdirSync(folder, { recursive: true });
    const fileSafeName = url.replace(/https?:\/\//, '').replace(/[^a-z0-9.-]/gi, '_');
    const filePath = path.join(folder, `${fileSafeName}.png`);
    if (!page.isClosed()) {
      await page.screenshot({ path: filePath, fullPage: true });
      collector.attachScreenshot(url, filePath);
    }
  }
}
