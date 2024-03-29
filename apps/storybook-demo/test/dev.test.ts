import { describe, test, before, after } from "node:test";
import {
  Browser,
  openBrowser,
  closeBrowser,
  hmrTest,
  cleanHmrTest,
  friendlyClassNameTest,
  findFreePort,
  killPortProcess,
} from "@internal/test-utils";
import { CARD_COMPONENT_PATH, VITE_ROOT } from "./utils";
import * as cp from "node:child_process";

describe("dev", () => {
  let port: number;
  let child: cp.ChildProcessWithoutNullStreams;
  let previewUrl: string;
  let browser: Browser;

  before(async () => {
    port = await findFreePort();
    previewUrl = `http://localhost:${port}/iframe.html?id=demo-card--default&viewMode=story`;

    child = await new Promise<typeof child>((resolve, reject) => {
      const child = cp.spawn(
        "pnpm",
        ["storybook", "--ci", "--port", port.toString()],
        {
          cwd: VITE_ROOT,
        }
      );

      child.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error("storybook exited with non-zero exit code"));
        }
      });

      child.stdout.on("data", (data) => {
        if (
          data.toString().includes("Storybook") &&
          data.toString().includes("started")
        ) {
          resolve(child);
        }
      });
    });

    browser = await openBrowser();
  });

  after(async () => {
    await closeBrowser(browser);
    await killPortProcess(port);
  });

  test("friendly classnames work", async () => {
    const page = await browser.newPage();
    await page.goto(previewUrl);

    await friendlyClassNameTest(page);
  });

  describe("hmr", () => {
    before(async () => {
      await cleanHmrTest(CARD_COMPONENT_PATH);
    });

    after(async () => {
      await cleanHmrTest(CARD_COMPONENT_PATH);
    });

    test("updating a style works", async () => {
      const page = await browser.newPage();
      await page.goto(previewUrl);

      await hmrTest(page, CARD_COMPONENT_PATH);
    });
  });
});
