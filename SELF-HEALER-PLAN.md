# Plan de Desarrollo: Self-Healer con Gemini para Playwright

## 1. Contexto

Este proyecto de automatización (`test-playwright`) usa Playwright 1.63 con TypeScript. El objetivo es implementar un **self-healer**: cuando una prueba unitaria falle, el sistema recolectará las evidencias del fallo (log de error, captura de pantalla y DOM de la página), las enviará a un modelo Gemini (se cuenta con `GEMINI_API_KEY` en `.env`) y la IA propondrá una solución concreta para la prueba fallida.

**Alcance inicial (MVP):** solo diagnóstico y propuesta. La IA no modifica código bajo ningún concepto; entrega una recomendación almacenada en un reporte.

## 2. Estado actual del proyecto

- Playwright `1.63.0`, Node v24. Las variables de entorno se cargan con la librería `dotenv` (`import 'dotenv/config'`) por simplicidad: una sola línea carga todo `.env`.
- Comandos: `npx playwright test`, `npx playwright test --headed`, `npx playwright test --trace=on`.
- Tests: `tests/product.spec.ts` (patrón Page Object) — `tests/example.spec.ts` no existe.
- Page objects: `pages/HomePage.ts`, `pages/ProductDetailsPage.ts`.
- Config: `fullyParallel: true`, `retries: 0` local / `2` CI, reporter `html`, `screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`.
- `.env` (gitignored) contiene `GEMINI_API_KEY`, `GEMINI_MODEL` y `HEALER_ENABLED`; hay plantilla versionada en `.env.template`. Instalados: SDK `@google/genai` (^2.23) y `dotenv` (^18).
- Implementado en `src/healer/`: `types.ts`, `llm-client.ts`, `prompt-builder.ts`, `healer.ts`, `report-store.ts`. Hechos los refactors (carga de env con dotenv centralizada en el fixture, adjuntos con `attachment.body`, `config.ts` eliminado). Pendiente: `tests/fixtures.ts`, import del spec, validación local y CI.
- CI: `.github/workflows/playwright.yml` corre `npm ci`, instala browsers y ejecuta los tests; sube `playwright-report/` como artifact.

## 3. Objetivo

Cuando una prueba falle o expire (timeout), el sistema debe:

1. Recolectar: mensaje de error + stack trace, captura de pantalla, DOM de la página y contexto del spec (selectores usados).
2. Enviar esas evidencias a Gemini (multimodal: imagen + texto) mediante el SDK oficial `@google/genai`.
3. Guardar la propuesta de solución (causa raíz, fix sugerido, confianza) en un reporte JSON por prueba fallida.
4. Mostrar un resumen del diagnóstico en la terminal.

## 4. Arquitectura propuesta

```
src/healer/
  types.ts            # Interfaces: LlmClient, HealerReport, Suggestion
  llm-client.ts       # GeminiClient implements LlmClient (medium generate)
  prompt-builder.ts   # Construye el prompt del sistema + usuario desde los datos del fallo
  healer.ts           # Orquesta: junta evidencias, llama a Gemini, devuelve la sugerencia
  report-store.ts     # Escribe test-results/healing/<testId>.json y resumen en consola
tests/
  fixtures.ts         # test/expect extendidos: captura DOM en afterEach si falló y dispara el healer
```

### 4.1 Flujo de ejecución

```
Test falla (status = failed | timedOut)
        │
        ▼
tests/fixtures.ts → test.afterEach
        │   1. page.content() → se adjunta el DOM al testInfo
        │   2. healer.run(testInfo)  [solo si HEALER_ENABLED]
        ▼
healer.ts
        │   lee error + stack + anexos (screenshot + DOM adjuntados en afterEach, con fallback a attachment.body)
        │   arma prompt vía prompt-builder.ts
        ▼
GeminiClient (llm-client.ts)  →  gemini-2.5-flash (multimodal: imagen + texto)
        ▼
Sugerencia JSON → report-store.ts → test-results/healing/<testId>.json + resumen en consola
```

### 4.2 Decisión de diseño importante

El DOM solo se puede capturar desde dentro de la prueba (un reporter no tiene acceso a `page`). Por eso se crea `tests/fixtures.ts` con un `test` extendido que en `afterEach`:
- Si `testInfo.status` es `failed`/`timedOut` → adjunta `page.content()` como anexo (`page-dom`, text/html).
- Si aún no hay adjunto de imagen (el screenshot automático `'only-on-failure'` puede adjuntarse después de los hooks), captura `page.screenshot()` y lo adjunta explícitamente.
- Los adjuntos se crean con `testInfo.attach({ body })`, que no genera archivo en disco; por eso `healer.ts` lee `attachment.body` como fallback cuando no hay `attachment.path`.
- Llama a `healer.run(testInfo)`.

Las variables de entorno (`GEMINI_API_KEY`, `GEMINI_MODEL`, `HEALER_ENABLED`) se leen inline en `tests/fixtures.ts` vía `dotenv`; no se usa `src/healer/config.ts`.

Los specs existentes y futuros solo cambian el import:
```ts
import { test, expect } from '../tests/fixtures'; // en lugar de '@playwright/test'
```

## 5. Datos enviados a Gemini por fallo

| Dato | Forma |
|------|-------|
| Título, archivo, navegador/proyecto | Texto |
| Mensaje de error + stack trace | Texto |
| Captura de pantalla | Imagen (base64, multimodal) |
| DOM de la página | Texto HTML truncado (~50 KB) |
| Fuente del spec + selectores usados | Texto (contexto) |

**Prompt** (instrucciones al modelo):
> Rol: experto en QA con Playwright. Dado el fallo, identifica la causa probable y propón una corrección concreta (ej. nuevo selector, cambio de código) respondiendo en JSON.

**Formato de respuesta esperado** (parsed y guardado):
```json
{
  "rootCause": "El selector espera el test-id 'product-nam' pero el DOM usa 'product-name'",
  "suggestedFix": "Cambiar page.getByTestId('product-nam') por page.getByTestId('product-name') en pages/ProductDetailsPage.ts",
  "confidence": "alta",
  "explanation": "El atributo data-testid difiere del esperado y provoca TimeoutError."
}
```

## 6. Configuración y variables de entorno

`.env`:
```
GEMINI_API_KEY=GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
HEALER_ENABLED=true
```
- Carga con `dotenv` (`import 'dotenv/config'`) desde `tests/fixtures.ts` (módulo de entrada), una sola vez; se evita la doble carga en los módulos del healer.
- Se elimina `src/healer/config.ts` (usaba `process.loadEnvFile` de Node 24): `healerEnabled()`, `geminiApiKey()` y `geminiModel()` pasan inline al fixture.
- `HEALER_ENABLED` permite desactivar el envío a Gemini en local/CI (control de costo).

## 7. Pasos de implementación

1. **[x] Dependencia**: `npm i @google/genai` (instalado, ^2.23). Se agregó también `dotenv` (^18).
2. **[x] `src/healer/types.ts`**: interfaces `LlmClient`, `HealerReport`, `Suggestion`.
3. **[x] `src/healer/llm-client.ts`**: `GeminiClient` que expone `generate(request: LlmRequest): Promise<string>` usando `@google/genai`.
4. **[x] `src/healer/prompt-builder.ts`**: prompt sistémico + usuario con el payload del fallo.
5. **[x] `src/healer/healer.ts`**: `run(testInfo)` — recolecta evidencias, llama a Gemini y devuelve la sugerencia.
6. **[x] Refactor: carga de env con `dotenv`** — se quitó el `import 'dotenv/config'` de `healer.ts` (la carga queda una sola vez en `tests/fixtures.ts`).
7. **[x] Refactor: adjuntos sin `path`** — en `healer.ts` se añadió `attachmentBuffer()` que lee `attachment.body` (buffer/string) como fallback cuando `testInfo.attach({ body })` no genera archivo (DOM y screenshot).
8. **[x] Refactor: eliminar `src/healer/config.ts`** — las lecturas `healerEnabled()`, `geminiApiKey()`, `geminiModel()` (antes con `process.loadEnvFile`) pasan inline a `tests/fixtures.ts`.
9. **[x] `src/healer/report-store.ts`**: persiste `test-results/healing/<testId>.json` y muestra un resumen en consola (con `console.log`). Verificado con spec temporal (roundtrip + sanitización del testId).
10. **[ ] `tests/fixtures.ts`**: `test`/`expect` extendidos con la lógica de `afterEach` (DOM `page-dom` text/html, screenshot explícito si falta adjunto de imagen, disparo del healer si `HEALER_ENABLED` y hubo fallo).
11. **[ ] Actualizar `tests/product.spec.ts`**: cambiar el import de `test` para usar el fixture.
12. **[ ] Validación local (antes de CI)**: con el fallo deliberado activo (selectores `product-nam`/`product-imag` en `ProductDetailsPage.ts`), ejecutar `npx playwright test` y verificar: reporte JSON en `test-results/healing/`, resumen en consola. Ajustar el healer sin tocar CI.
13. **[ ] CI**: en `.github/workflows/playwright.yml`:
    - Agregar `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}` y `HEALER_ENABLED: 'true'` como `env` del paso de tests.
    - Agregar secret `GEMINI_API_KEY` en el repositorio (Settings → Secrets).
    - Subir también `test-results/healing/` como artifact.
    - El fallo deliberado se mantiene activo para validar el healing en CI (no se revierte).

## 8. Convenciones a respetar (AGENTS.md)

- Todos los comandos usan `npx playwright` directamente (no hay scripts en `package.json`; no agregar scripts).
- Respetar el patrón Page Object y la estructura `tests/` + `pages/`.
- `test-results/` y `.env` ya están en `.gitignore`; los reportes del healer no se versionan.

## 9. Escalabilidad futura (fuera del MVP)

- **Fase 2**: auto-aplicar el locator sugerido por la IA y re-ejecutar con validación (self-healing activo).
- **Abstracción de proveedores**: la interfaz `LlmClient` permite conectar OpenAI, Claude o modelos locales sin tocar la orquestación.
- **Historial y aprendizaje**: almacenar fallos + soluciones aceptadas para few-shot/retrieval y mejorar diagnósticos.
- **Límites de costo**: control de rate-limit, resumen previo del DOM si excede umbrales, y apagado automático por presupuesto.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Costo por llamadas a Gemini | Flag `HEALER_ENABLED`; modelo flash; solo se envía en fallos. |
| DOM muy grande excede el contexto | Truncado a ~50 KB; a futuro, resumen previo. |
| Respuesta no-JSON del modelo | Parsing con fallback + guardar respuesta cruda en el reporte. |
| Falsos positivos del diagnóstico | La fase 2 exigirá validación automática aplicando el fix y re-ejecutando. |