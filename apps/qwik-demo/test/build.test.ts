import { describe, test, before, after } from "node:test";
import { VITE_ROOT } from "./utils";
import * as assert from "node:assert";
import {
  Browser,
  builtStylesGetAppliedTest,
  closeBrowser,
  findFreePort,
  killPortProcess,
  openBrowser,
} from "@internal/test-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cp from "node:child_process";

describe("build", () => {
  test("builds without crashing", async () => {
    const result = cp.spawnSync("pnpm", ["build"], {
      cwd: VITE_ROOT,
      env: process.env,
    });

    assert.equal(result.status, 0, "build should exit with status code 0");
  });
});

describe("build output", () => {
  let publicAssetsDir: string;

  before(async () => {
    publicAssetsDir = path.join(VITE_ROOT, "dist", "build");

    cp.spawnSync("pnpm", ["build"], {
      cwd: VITE_ROOT,
      env: process.env,
    });
  });

  test("stylex stylesheet contains the expected styles", async () => {
    const files = await fs.readdir(publicAssetsDir);
    const stylexFile = files.find((file) => file.endsWith(".css"));
    const stylexCss = await fs.readFile(
      path.join(publicAssetsDir, stylexFile!),
      "utf-8"
    );
    const expectedCss = `background-color:#fff`;

    assert.ok(
      stylexCss.includes(expectedCss),
      `stylex stylesheet should contain the expected styles: ${expectedCss}`
    );
  });

  describe("preview", () => {
    let child: cp.ChildProcessWithoutNullStreams;
    let address: string;
    let browser: Browser;
    let port: number;

    before(async () => {
      port = await findFreePort();

      address = await new Promise<string>((resolve, reject) => {
        child = cp.spawn("pnpm", ["preview:test", "--port", port.toString()], {
          cwd: VITE_ROOT,
          env: process.env,
          stdio: "pipe",
        });

        child.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error("preview exited with non-zero exit code"));
          }
        });

        child.stdout.on("data", (data) => {
          if (data.toString().includes(`http://localhost`)) {
            resolve(`http://localhost:${port}`);
          }
        });
      });

      browser = await openBrowser();
    });

    after(async () => {
      await closeBrowser(browser);
      await killPortProcess(port);
    });

    test("styles should be applied", async () => {
      const page = await browser.newPage();
      await page.goto(address);

      await builtStylesGetAppliedTest(page);
    });
  });
});
