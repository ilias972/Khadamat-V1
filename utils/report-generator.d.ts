export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'navigation' | 'performance' | 'accessibility' | 'security' | 'visual' | 'form' | 'network' | 'seo' | 'javascript';
export interface Issue {
    severity: Severity;
    category: Category;
    page: string;
    description: string;
    screenshot?: string;
    stackTrace?: string;
    recommendation?: string;
}
export interface PerfSample {
    ttfb: number;
    domContentLoaded: number;
    load: number;
}
interface CollectorContext {
    browser?: string;
}
export declare class ReportCollector {
    private baseUrl;
    private issues;
    private perf;
    private screenshots;
    private startedAt;
    private context;
    constructor(baseUrl: string);
    setContext(ctx: CollectorContext): void;
    addIssue(issue: Issue): void;
    addPerfSample(url: string, sample: PerfSample): void;
    attachScreenshot(url: string, pathToFile: string): void;
    getReport(): {
        summary: {
            baseUrl: string;
            totalPages: string | number;
            totalErrors: number;
            criticalErrors: number;
            highErrors: number;
            warnings: number;
            suggestions: number;
            testDurationMs: number;
            timestamp: string;
            context: CollectorContext;
        };
        issues: Issue[];
        perf: Record<string, PerfSample>;
        screenshots: Record<string, string>;
    };
}
export declare function writeReport(outputDir: string, collector: ReportCollector): Promise<void>;
export {};
