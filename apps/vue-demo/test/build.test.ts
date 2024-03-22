import { describe, test, before, after } from "node:test";
import * as vite from "vite";
import { VITE_ROOT } from "./utils";
import * as assert from "node:assert";
import { makeTempDir } from "@internal/test-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("build", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await makeTempDir();
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("builds without crashing", async () => {
    const build = await vite.build({
      root: VITE_ROOT,
    });

    assert.ok(build, "build should be truthy");
  });
});

describe("build output", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await makeTempDir();

    await vite.build({
      root: VITE_ROOT,
      build: {
        outDir: tempDir,
      },
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

  test("index.html contains a link to the stylex stylesheet", async () => {
    const indexHtml = await fs.readFile(
      path.join(tempDir, "index.html"),
      "utf-8"
    );
    const stylexLink = indexHtml.includes(
      `<link rel="stylesheet" href="/assets/stylex.`
    );

    assert.ok(
      stylexLink,
      "index.html should contain a link to the stylex stylesheet"
    );
  });

  test("stylex stylesheet contains the expected styles", async () => {
    const files = await fs.readdir(path.join(tempDir, "assets"));
    const stylexFile = files.find(
      (file) => file.includes("stylex") && file.endsWith(".css")
    );
    const stylexCss = await fs.readFile(
      path.join(tempDir, "assets", stylexFile!),
      "utf-8"
    );
    const expectedCss = `background-color:#fff`;

    assert.ok(
      stylexCss.includes(expectedCss),
      `stylex stylesheet should contain the expected styles: ${expectedCss}`
    );
  });
});
