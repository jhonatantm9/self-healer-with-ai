import { createPartFromBase64, GoogleGenAI } from '@google/genai';
import type { LlmClient, LlmRequest } from './types';

export class GeminiClient implements LlmClient {
    private readonly ai: GoogleGenAI;
    private readonly model: string;

    constructor(apiKey: string, model: string) {
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async generate(request: LlmRequest): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: request.text },
                        ...request.images.map((image) =>
                            createPartFromBase64(image.base64, image.mimeType),
                        ),
                    ],
                },
            ],
        });

        const output = response.text?.trim();
        if (!output) {
            throw new Error('Gemini devolvió una respuesta vacía.');
        }
        return output;
    }
}