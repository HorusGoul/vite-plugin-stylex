import { Browser, webkit } from "playwright-webkit";

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
