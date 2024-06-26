import { describe, test, before, after } from "node:test";
import { VITE_ROOT } from "./utils";
import * as assert from "node:assert";
import { makeTempDir } from "@internal/test-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cp from "node:child_process";

describe("build", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await makeTempDir();
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("builds without crashing", async () => {
    const build = cp.spawnSync(
      "pnpm",
      ["build-storybook", "--output-dir", tempDir],
      {
        cwd: VITE_ROOT,
      }
    );
    assert.equal(build.status, 0, "build should exit with status code 0");
  });
});

describe("build output", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await makeTempDir();

    cp.spawnSync("pnpm", ["build-storybook", "--output-dir", tempDir], {
      cwd: VITE_ROOT,
    });
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("stylex stylesheet contains the expected styles", async () => {
    const files = await fs.readdir(path.join(tempDir, "assets"));
    const stylexFile = files.find(
      (file) => file.startsWith("preview") && file.endsWith(".css")
    );
    const stylexCss = await fs.readFile(
      path.join(tempDir, "assets", stylexFile),
      "utf-8"
    );
    const expectedCss = `background-color:#fff`;

    assert.ok(
      stylexCss.includes(expectedCss),
      `stylex stylesheet should contain the expected styles: ${expectedCss}`
    );
  });
});
