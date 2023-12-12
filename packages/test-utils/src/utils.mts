import { Browser, webkit } from "playwright-webkit";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

export type { Browser };

export async function openBrowser() {
  const browser = await webkit.launch({
    headless: true,
  });
  return browser;
}

export async function closeBrowser(browser: Browser) {
  await browser.close();
}

export async function makeTempDir() {
  const tempDirPath = await fs.mkdtemp(
    path.join(tmpdir(), "vite-plugin-stylex-e2e-")
  );

  return tempDirPath;
}
