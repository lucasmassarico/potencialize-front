import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = "http://127.0.0.1:4173";
const runtimeEnv =
    (globalThis as typeof globalThis & {
        process?: { env: Record<string, string | undefined> };
    }).process?.env ?? {};
const externalBaseUrl = runtimeEnv.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? localBaseUrl;

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: Boolean(runtimeEnv.CI),
    retries: runtimeEnv.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
    ],
    outputDir: "test-results",
    preserveOutput: "failures-only",
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: externalBaseUrl
        ? undefined
        : {
              // Chamar o binário diretamente permite que o Playwright encerre o
              // servidor e todo o processo de forma confiável também no Windows.
              command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
              url: localBaseUrl,
              reuseExistingServer: false,
              timeout: 120_000,
              env: {
                  VITE_API_BASE_URL: `${localBaseUrl}/api/v1`,
                  VITE_AUTH_MODE: "cookie",
              },
          },
});
