# Self-Healer con IA

Un proyecto de automatización de tests con Playwright que implementa un **self-healer**: cuando una prueba falla, el sistema recolecta evidencias (error, DOM, screenshot) y las envía a un modelo de IA (Gemini) para obtener una propuesta de solución.

## Qué hace

- Detecta cuándo una prueba falla o expira (timeout)
- Recolecta: mensaje de error + stack trace, captura de pantalla y DOM de la página
- Envía esas evidencias a Gemini (gemini-2.5-flash) mediante `@google/genai`
- Genera un reporte JSON con: causa raíz, fix sugerido y nivel de confianza
- Almacena los reportes en `test-results/healing/` (gitignored)

## Arquitectura

```
src/healer/
  types.ts           # Interfaces: LlmClient, HealerReport, Suggestion
  llm-client.ts      # GeminiClient que implementa LlmClient
  prompt-builder.ts  # Construye prompts sistemático + usuario
  healer.ts          # Orquesta: junta evidencia, llama a Gemini, devuelve sugerencia
  report-store.ts    # Escribe test-results/healing/<testId>.json + resumen consola

tests/
  fixtures.ts        # test/expect extendidos: afterEach captura DOM/screenshot,
                     # dispara healer si hay fallo y HEALER_ENABLED=true
  product.spec.ts    # Tests usando el patrón Page Object Model

pages/
  HomePage.ts        # Página de inicio
  ProductDetailsPage.ts # Página de detalles
```

### Flujo de ejecución cuándo falla un test

```
Test falla
        │
        ▼
tests/fixtures.ts → test.afterEach
        │   1. page.content() → adjunta DOM (page-dom, text/html)
        │   2. page.screenshot() → si no hay screenshot previo
        ▼
healer.ts
        │   lee error + stack + anexos
        │   arma prompt vía prompt-builder.ts
        ▼
GeminiClient → gemini-2.5-flash (multimodal: imagen + texto)
        ▼
Sugerencia JSON → report-store.ts → test-results/healing/<testId>.json + resumen consola
```

### Variables de entorno

Archivo `.env`:

```
GEMINI_API_KEY= Tu clave API de Gemini
GEMINI_MODEL= gemini-2.5-flash
HEALER_ENABLED= true
```

## Cómo clonar y ejecutar

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd test-playwright

# 2. Instalar dependencias
npm i

# 3. Instalar browsers de Playwright (opcional)
npx playwright install --with-deps

# 4. Ejecutar tests
npx playwright test
```

## Comandos útiles

- `npx playwright test` - suite completa
- `npx playwright test tests/product.spec.ts` - solo un archivo
- `ls test-results/healing/` - ver reportes de healing generados