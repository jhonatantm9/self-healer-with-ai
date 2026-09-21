import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HealerReport } from './types';

const HEALING_DIR = path.join('test-results', 'healing');

function sanitizeTestId(testId: string): string {
    return testId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function saveReport(report: HealerReport): Promise<string> {
    await mkdir(HEALING_DIR, { recursive: true });

    const baseName = sanitizeTestId(report.testId) || `healing-${Date.now()}`;
    const filePath = path.join(HEALING_DIR, `${baseName}.json`);

    await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return filePath;
}

export function printSummary(report: HealerReport, filePath: string): void {
    console.log('-----------------------------------------------');
    console.log('Self-Healer | Diagnostico');
    console.log('-----------------------------------------------');
    console.log(`Prueba:        ${report.testTitle}`);
    console.log(`Archivo:       ${report.testFile}`);

    if (report.suggestion) {
        console.log(`Causa raiz:    ${report.suggestion.rootCause}`);
        console.log(`Fix sugerido:  ${report.suggestion.suggestedFix}`);
        console.log(`Confianza:     ${report.suggestion.confidence}`);
        console.log(`Explicacion:   ${report.suggestion.explanation}`);
    } else if (report.error) {
        console.log(`Error:         ${report.error}`);
    } else {
        console.log('Error:         Sin sugerencia disponible.');
    }

    console.log(`Reporte:       ${filePath}`);
    console.log('-----------------------------------------------');
}