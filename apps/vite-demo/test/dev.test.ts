import { describe, test, beforeEach, afterEach } from "node:test";
import * as vite from "vite";
import {
  Browser,
  openBrowser,
  closeBrowser,
  hmrTest,
  cleanHmrTest,
  friendlyClassNameTest,
  externalStyleXTest,
} from "@internal/test-utils";
import { CARD_COMPONENT_PATH, VITE_ROOT } from "./utils";

describe("dev", () => {
  let devServer: vite.ViteDevServer;
  let serverUrl: string;
  let browser: Browser;

  beforeEach(async () => {
    devServer = await vite.createServer({
      root: VITE_ROOT,
      server: {
        port: 0,
        host: "127.0.0.1",
      },
    });

    devServer = await devServer.listen();

    const address = devServer.httpServer.address();

    if (typeof address === "string") {
      serverUrl = address;
    } else {
      serverUrl = `http://${address.address}:${address.port}`;
    }

    browser = await openBrowser();
  });

  afterEach(async () => {
    await devServer.close();
    await closeBrowser(browser);
  });

  test("friendly classnames work", async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    await friendlyClassNameTest(page);
  });

  test("external stylesheets like @stylexjs/open-props work", async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    await externalStyleXTest(page);
  });

  describe("hmr", () => {
    beforeEach(async () => {
      await cleanHmrTest(CARD_COMPONENT_PATH);
    });

    afterEach(async () => {
      await cleanHmrTest(CARD_COMPONENT_PATH);
    });

    test("updating a style works", async () => {
      const page = await browser.newPage();
      await page.goto(serverUrl);

      await hmrTest(page, CARD_COMPONENT_PATH);
    });
  });
});
