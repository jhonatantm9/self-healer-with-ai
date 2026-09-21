import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { TestInfo } from '@playwright/test';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt-builder';
import type {
    FailureEvidence,
    HealerReport,
    LlmClient,
    LlmImage,
    Suggestion,
} from './types';

const DOM_ATTACHMENT_NAME = 'page-dom';

function errorMessageOf(testInfo: TestInfo): string {
    return testInfo.errors[0]?.message ?? testInfo.error?.message ?? 'Sin mensaje de error.';
}

function stackTraceOf(testInfo: TestInfo): string | undefined {
    return testInfo.errors[0]?.stack ?? testInfo.error?.stack;
}

function relativePath(absPath: string): string {
    return path.relative(process.cwd(), absPath) || absPath;
}

async function attachmentBuffer(attachment: TestInfo['attachments'][number]): Promise<Buffer | undefined> {
    if (attachment.path) {
        return readFile(attachment.path);
    }
    if (attachment.body !== undefined) {
        return Buffer.isBuffer(attachment.body) ? attachment.body : Buffer.from(attachment.body);
    }
    return undefined;
}

function parseSuggestion(raw: string): Suggestion {
    const json = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();

    const data = JSON.parse(json) as Partial<Suggestion>;
    if (!data.rootCause || !data.suggestedFix || !data.confidence || !data.explanation) {
        throw new Error('La respuesta del modelo no tiene la forma esperada.');
    }
    return {
        rootCause: data.rootCause,
        suggestedFix: data.suggestedFix,
        confidence: data.confidence,
        explanation: data.explanation,
    };
}

export class Healer {
    private readonly llmClient: LlmClient;

    constructor(llmClient: LlmClient) {
        this.llmClient = llmClient;
    }

    async run(testInfo: TestInfo): Promise<HealerReport | null> {
        if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
            return null;
        }

        const evidence = await this.buildEvidence(testInfo);
        const report: HealerReport = {
            testId: testInfo.testId,
            testTitle: evidence.testTitle,
            testFile: evidence.testFile,
            project: evidence.project,
            timestamp: new Date().toISOString(),
            evidence,
        };

        try {
            const images = await this.collectImages(testInfo);
            const userPrompt = buildUserPrompt(evidence);
            const raw = await this.llmClient.generate({
                text: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
                images,
            });
            report.rawLlmOutput = raw;

            try {
                report.suggestion = parseSuggestion(raw);
            } catch (parseError) {
                report.error = `La respuesta de la IA no pudo interpretarse: ${(parseError as Error).message}`;
            }
        } catch (llmError) {
            report.error = `La llamada a la IA falló: ${(llmError as Error).message}`;
        }

        return report;
    }

    private async buildEvidence(testInfo: TestInfo): Promise<FailureEvidence> {
        return {
            testTitle: testInfo.title,
            testFile: relativePath(testInfo.file),
            project: testInfo.project.name,
            errorMessage: errorMessageOf(testInfo),
            stackTrace: stackTraceOf(testInfo),
            pageHtml: await this.collectPageHtml(testInfo),
        };
    }

    private async collectPageHtml(testInfo: TestInfo): Promise<string | undefined> {
        const attachment = testInfo.attachments.find(
            (a) => a.name === DOM_ATTACHMENT_NAME || a.contentType === 'text/html',
        );
        if (!attachment) {
            return undefined;
        }
        const buffer = await attachmentBuffer(attachment);
        return buffer?.toString('utf8');
    }

    private async collectImages(testInfo: TestInfo): Promise<LlmImage[]> {
        const images: LlmImage[] = [];

        for (const attachment of testInfo.attachments) {
            if (!attachment.contentType?.startsWith('image/')) {
                continue;
            }
            const buffer = await attachmentBuffer(attachment);
            if (!buffer) {
                continue;
            }
            images.push({
                mimeType: attachment.contentType,
                base64: buffer.toString('base64'),
            });
        }

        return images;
    }
}