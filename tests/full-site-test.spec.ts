import { expect, test } from '@playwright/test';
import path from 'path';
import {
  buildDefaultConfig,
  crawlSite,
  inspectPage,
  pauseBetweenRequests,
  SiteTestConfig,
} from '../utils/test-helpers';
import { ReportCollector, writeReport } from '../utils/report-generator';

// Charge la configuration (modifiable via variables d'environnement)
const config: SiteTestConfig = buildDefaultConfig();
const reportCollector = new ReportCollector(config.baseUrl);

test.describe.configure({ mode: 'parallel' });

test('Full site crawl and checks', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  reportCollector.setContext({ browser: browserName });

  // 1) Crawl de découverte (BFS limité)
  const discoveredUrls = await crawlSite(page, config, reportCollector);

  // 2) Inspection de chaque page découverte
  for (const url of discoveredUrls) {
    await pauseBetweenRequests(config);
    await inspectPage(page, url, config, reportCollector);
  }
});

test.afterAll(async () => {
  const outputDir = path.join(process.cwd(), 'test-results');
  await writeReport(outputDir, reportCollector);
  console.log(`Rapport généré dans ${outputDir}`);
});
