import type { FailureEvidence } from './types';

const MAX_DOM_LENGTH = 50_000;

export const SYSTEM_PROMPT = `
Eres un experto en automatización de pruebas con Playwright (TypeScript).
Recibes la evidencia de una prueba automatizada que ha fallado: mensaje de error,
stack trace, código HTML de la página (DOM) y una captura de pantalla.

Tu tarea es:
1. Identificar la causa más probable del fallo.
2. Proponer una corrección concreta y accionable (por ejemplo: un locator/selector
   alternativo con su atributo data-testid real, o el cambio de código necesario).
3. Responder ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{
  "rootCause": "causa probable en una frase",
  "suggestedFix": "corrección concreta: código o selector exacto a usar",
  "confidence": "alta" | "media" | "baja",
  "explanation": "explicación breve de por qué falla y cómo se resuelve"
}
No uses markdown (ni bloques \`\`\`) alrededor del JSON.
`;

function truncate(text: string, maxLength: number): string {
    return text.length > maxLength
        ? `${text.slice(0, maxLength)}\n...[truncado]`
        : text;
}

export function buildUserPrompt(evidence: FailureEvidence): string {
    const parts: string[] = [
        `Prueba: ${evidence.testTitle}`,
        `Archivo: ${evidence.testFile}`,
        `Proyecto/navegador: ${evidence.project ?? 'desconocido'}`,
        '',
        'Mensaje de error:',
        evidence.errorMessage,
    ];

    if (evidence.stackTrace) {
        parts.push('', 'Stack trace:', truncate(evidence.stackTrace, 10_000));
    }

    if (evidence.pageHtml) {
        parts.push('', 'DOM de la página (HTML):', truncate(evidence.pageHtml, MAX_DOM_LENGTH));
    }

    parts.push('', 'La captura de pantalla va adjunta como imagen.');

    return parts.join('\n');
}