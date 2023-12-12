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

export async function makeTempDir(prefix = tmpdir()) {
  await fs.mkdir(prefix, { recursive: true });

  const tempDirPath = await fs.mkdtemp(
    path.join(prefix, "vite-plugin-stylex-e2e-")
  );

  return tempDirPath;
}

export async function findFreePort() {
  const server = await import("node:net").then((m) =>
    m.createServer((s) => s.end())
  );

  return new Promise<number>((resolve) => {
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}
