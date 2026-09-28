import 'dotenv/config';
import { test as base, expect } from '@playwright/test';
import { GeminiClient } from '../src/healer/llm-client';
import { Healer } from '../src/healer/healer';
import { printSummary, saveReport } from '../src/healer/report-store';

const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const healerEnabled = process.env.HEALER_ENABLED === 'true';

export const test = base.extend({});

test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
        return;
    }
    if (!healerEnabled) {
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY no está definida. Configúrala en .env (ver .env.template) para usar el self-healer.',
        );
    }

    await testInfo.attach('page-dom', { body: await page.content(), contentType: 'text/html' });

    if (!testInfo.attachments.some((a) => a.contentType?.startsWith('image/'))) {
        await testInfo.attach('page-screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    }

    const healer = new Healer(new GeminiClient(apiKey, model));
    const report = await healer.run(testInfo);
    if (report) {
        const filePath = await saveReport(report);
        printSummary(report, filePath);
    }
});

export { expect };