import { Page } from '@playwright/test';
import { ReportCollector } from './report-generator';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'navigation' | 'performance' | 'accessibility' | 'security' | 'visual' | 'form' | 'network' | 'seo' | 'javascript';
export interface SiteTestConfig {
    baseUrl: string;
    maxPages: number;
    delayMsBetweenRequests: number;
    excludePatterns: RegExp[];
    sameOriginOnly: boolean;
    viewports: {
        width: number;
        height: number;
        label: string;
    }[];
    screenshotOnIssue: boolean;
}
export declare function buildDefaultConfig(): SiteTestConfig;
export declare function pauseBetweenRequests(config: SiteTestConfig): Promise<void>;
export declare function extractLinks(page: Page, config: SiteTestConfig): Promise<string[]>;
export declare function crawlSite(page: Page, config: SiteTestConfig, collector: ReportCollector): Promise<string[]>;
export declare function inspectPage(page: Page, url: string, config: SiteTestConfig, collector: ReportCollector): Promise<void>;
