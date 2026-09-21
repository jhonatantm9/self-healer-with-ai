export interface LlmImage {
    mimeType: string;
    base64: string;
}

export interface LlmRequest {
    text: string;
    images: LlmImage[];
}

export interface LlmClient {
    generate(request: LlmRequest): Promise<string>;
}

export interface FailureEvidence {
    testTitle: string;
    testFile: string;
    project: string | undefined;
    errorMessage: string;
    stackTrace?: string;
    pageHtml?: string;
}

export interface Suggestion {
    rootCause: string;
    suggestedFix: string;
    confidence: string;
    explanation: string;
}

export interface HealerReport {
    testId: string;
    testTitle: string;
    testFile: string;
    project: string | undefined;
    timestamp: string;
    evidence: FailureEvidence;
    suggestion?: Suggestion;
    rawLlmOutput?: string;
    error?: string;
}