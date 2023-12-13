import { Page } from "playwright-webkit";
import * as fs from "node:fs/promises";

export const CARD_SELECTOR = `[data-testId='card']`;
const CARD_FRIENDLY_CLASSNAME = `Card__styles.root`;

export async function runtimeInjectionTest(page: Page) {
  await page.waitForSelector("[data-stylex='true']", {
    state: "attached",
  });

  await page.waitForSelector(CARD_SELECTOR, {
    state: "visible",
  });
}

export async function hmrTest(page: Page, cardComponentPath: string) {
  await page.waitForSelector(CARD_SELECTOR, {
    state: "visible",
  });

  await updateCardComponent(cardComponentPath);

  await page.$eval(CARD_SELECTOR, (el) => {
    // Computed backgroundColor should be red
    return new Promise<void>(async (resolve, reject) => {
      function check() {
        const computedStyle = window.getComputedStyle(el);

        if (computedStyle.backgroundColor === "rgb(255, 0, 0)") {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      }

      check();

      setTimeout(
        () => reject(new Error("Computed backgroundColor should be red")),
        5000
      );
    });
  });
}

async function updateCardComponent(cardComponentPath: string) {
  const src = await fs.readFile(cardComponentPath, "utf-8");

  const newSrc = src.replace(
    `backgroundColor: "white"`,
    `backgroundColor: "red"`
  );

  await fs.writeFile(cardComponentPath, newSrc);
}

export async function cleanHmrTest(cardComponentPath: string) {
  const src = await fs.readFile(cardComponentPath, "utf-8");

  const newSrc = src.replace(
    `backgroundColor: "red"`,
    `backgroundColor: "white"`
  );

  await fs.writeFile(cardComponentPath, newSrc);
}

export async function friendlyClassNameTest(page: Page) {
  const element = await page.waitForSelector(CARD_SELECTOR, {
    state: "visible",
  });

  const classList = await element.evaluate((el) => {
    return Array.from(el.classList);
  });

  if (classList.includes(CARD_FRIENDLY_CLASSNAME)) {
    return;
  }

  throw new Error(`Expected element to have class ${CARD_FRIENDLY_CLASSNAME}`);
}
