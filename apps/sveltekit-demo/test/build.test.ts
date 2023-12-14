import { describe, test, before, after } from "node:test";
import * as vite from "vite";
import { VITE_ROOT } from "./utils";
import * as assert from "node:assert";
import {
  Browser,
  builtStylesGetAppliedTest,
  closeBrowser,
  openBrowser,
} from "@internal/test-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const COMPILED_ASSETS_FOLDER = path.join(
  VITE_ROOT,
  ".svelte-kit/output/client/_app/immutable/assets"
);

describe("build", () => {
  before(async () => {
    await vite.build({
      root: VITE_ROOT,
    });
  });

  test("built assets should contain stylesheets with StyleX CSS", async () => {
    const files = await fs.readdir(COMPILED_ASSETS_FOLDER);
    const cssFiles = files.filter((file) => file.endsWith(".css"));

    for (const file of cssFiles) {
      const content = await fs.readFile(
        path.join(COMPILED_ASSETS_FOLDER, file),
        "utf-8"
      );

      if (!content.includes("background-color:white")) {
        assert.fail(
          "all output CSS files should contain the expected stylex extracted styles"
        );
      }
    }
  });

  test("stylex file should not be in the public build output", async () => {
    const files = await fs.readdir(COMPILED_ASSETS_FOLDER);
    const stylexFile = files.some(
      (file) => file.includes("stylex.") && file.endsWith(".css")
    );

    assert.ok(!stylexFile, "stylex file should not be in the build output");
  });

  describe("preview", () => {
    let server: vite.PreviewServer;
    let serverUrl: string;
    let browser: Browser;

    before(async () => {
      server = await vite.preview({
        root: VITE_ROOT,
        server: {
          port: 0,
          host: "127.0.0.1",
        },
      });

      const address = server.httpServer!.address();

      if (typeof address === "string") {
        serverUrl = address;
      } else {
        serverUrl = `http://${address!.address}:${address!.port}`;
      }

      browser = await openBrowser();
    });

    after(async () => {
      await new Promise((resolve) => {
        server.httpServer.close(() => {
          resolve(null);
        });
      });
      await closeBrowser(browser);
    });

    test("styles should be applied", async () => {
      const page = await browser.newPage();
      await page.goto(serverUrl);

      await builtStylesGetAppliedTest(page);
    });
  });
});
