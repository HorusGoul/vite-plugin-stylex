import { describe, test, before, after } from "node:test";
import { E2E_TEMP_DIR, VITE_ROOT } from "./utils";
import * as assert from "node:assert";
import {
  Browser,
  builtStylesGetAppliedTest,
  closeBrowser,
  findFreePort,
  makeTempDir,
  openBrowser,
} from "@internal/test-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cp from "node:child_process";

describe.skip("build", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await makeTempDir(E2E_TEMP_DIR);
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("builds without crashing", async () => {
    process.env.OVERRIDE_BUILD_DIRECTORY = path.relative(
      VITE_ROOT,
      path.join(tempDir, "build")
    );

    const result = cp.spawnSync("pnpm", ["build"], {
      cwd: VITE_ROOT,
      env: process.env,
    });

    assert.equal(result.status, 0, "build should exit with status code 0");
  });
});

describe("build output", () => {
  let tempDir: string;
  let publicAssetsDir: string;

  before(async () => {
    tempDir = await makeTempDir(E2E_TEMP_DIR);
    publicAssetsDir = path.join(tempDir, "build", "client", "assets");

    process.env.OVERRIDE_BUILD_DIRECTORY = path.relative(
      VITE_ROOT,
      path.join(tempDir, "build")
    );

    cp.spawnSync("pnpm", ["build"], {
      cwd: VITE_ROOT,
      env: process.env,
    });
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("built assets should contain a stylesheet for the root component", async () => {
    const files = await fs.readdir(publicAssetsDir);
    const rootStylesheetFile = files.some(
      (file) => file.startsWith("root") && file.endsWith(".css")
    );

    assert.ok(
      rootStylesheetFile,
      "a stylesheet file for the root component should exist in the build output"
    );
  });

  test("root stylesheet contains the stylex styles", async () => {
    const files = await fs.readdir(publicAssetsDir);
    const rootStylesheetFile = files.find(
      (file) => file.startsWith("root") && file.endsWith(".css")
    );
    const stylexCss = await fs.readFile(
      path.join(publicAssetsDir, rootStylesheetFile!),
      "utf-8"
    );
    const expectedCss = `background-color:white`;

    assert.ok(
      stylexCss.includes(expectedCss),
      `root stylesheet should contain the expected stylex extracted styles: ${expectedCss}`
    );
  });

  test("stylex file should not be in the public build output", async () => {
    const files = await fs.readdir(publicAssetsDir);
    const stylexFile = files.some(
      (file) => file.includes("stylex.") && file.endsWith(".css")
    );

    assert.ok(!stylexFile, "stylex file should not be in the build output");
  });

  test("stylex file should not be in the server build output", async () => {
    const files = await fs
      .readdir(path.join(tempDir, "build", "server", "assets"))
      // Catching if the directory doesn't exist
      .catch(() => []);
    const stylexFile = files.some(
      (file) => file.includes("stylex.") && file.endsWith(".css")
    );

    assert.ok(!stylexFile, "stylex file should not be in the build output");
  });

  test("server-build-HASH.css file should not be in the server build output", async () => {
    const files = await fs
      .readdir(path.join(tempDir, "build", "server", "assets"))
      // Catching if the directory doesn't exist
      .catch(() => []);
    const stylexFile = files.some(
      (file) => file.includes("server-build-") && file.endsWith(".css")
    );

    assert.ok(
      !stylexFile,
      "server-build-HASH.css file should not be in the build output"
    );
  });

  describe("remix serve", () => {
    let child: cp.ChildProcessWithoutNullStreams;
    let address: string;
    let browser: Browser;

    before(async () => {
      const port = await findFreePort();

      address = await new Promise<string>((resolve, reject) => {
        child = cp.spawn(
          "pnpm",
          ["remix-serve", path.join(tempDir, "build", "server", "index.mjs")],
          {
            cwd: VITE_ROOT,
            env: {
              ...process.env,
              PORT: port.toString(),
            },
            stdio: "pipe",
          }
        );

        child.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error("remix-serve exited with non-zero exit code"));
          }
        });

        child.stdout.on("data", (data) => {
          if (data.toString().includes("[remix-serve]")) {
            // Example line, we pick the second item:
            // [remix-serve] http://localhost:3000 (http://192.168.1.101:3000)
            const line = data.toString();
            const splitted = line.split(" ");
            const address = splitted[1];

            resolve(address);
          }
        });
      });

      browser = await openBrowser();
    });

    after(async () => {
      await closeBrowser(browser);
      await new Promise((resolve) => {
        child.on("close", () => {
          resolve(null);
        });

        child.kill();
      });
    });

    test("styles should be applied", async () => {
      const page = await browser.newPage();
      await page.goto(address);

      await builtStylesGetAppliedTest(page);
    });
  });
});
