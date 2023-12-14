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

  test("built assets should contain a stylex stylesheet", async () => {
    const files = await fs.readdir(path.join(tempDir, "assets"));
    const stylexFile = files.some(
      (file) => file.includes("stylex") && file.endsWith(".css")
    );

    assert.ok(stylexFile, "an stylex file should exist in the build output");
  });

  test("iframe.html contains a link to the stylex stylesheet", async () => {
    const indexHtml = await fs.readFile(
      path.join(tempDir, "iframe.html"),
      "utf-8"
    );
    const stylexLink = indexHtml.includes(
      `<link rel="stylesheet" href="assets/stylex.`
    );

    assert.ok(
      stylexLink,
      "iframe.html should contain a link to the stylex stylesheet"
    );
  });

  test("stylex stylesheet contains the expected styles", async () => {
    const files = await fs.readdir(path.join(tempDir, "assets"));
    const stylexFile = files.find(
      (file) => file.includes("stylex") && file.endsWith(".css")
    );
    const stylexCss = await fs.readFile(
      path.join(tempDir, "assets", stylexFile),
      "utf-8"
    );
    const expectedCss = `background-color:white`;

    assert.ok(
      stylexCss.includes(expectedCss),
      `stylex stylesheet should contain the expected styles: ${expectedCss}`
    );
  });
});
