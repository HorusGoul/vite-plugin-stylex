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

  await waitForCardBackgroundColor(page, "rgb(255, 255, 255)");

  await updateCardComponent(cardComponentPath);

  // Some frameworks like Qwik don't support HMR for global CSS,
  // so we need to retry in case the page reloads instead of HMRing.
  // It's not truly testing for HMR, but it's what the framework supports.
  // The objective is to make sure the style updates successfully, not
  // test HMR capabilities of the framework.
  await retryIfErrorDoesntMatch(
    () => waitForCardBackgroundColor(page, "rgb(255, 0, 0)"),
    "backgroundColor should be"
  );
}

export async function externalStyleXTest(page: Page) {
  await page.waitForSelector(CARD_SELECTOR, {
    state: "visible",
  });

  // Corresponds with color.blue1 from @stylexjs/open-props
  await waitForCardBorderColor(page, "rgb(208, 235, 255)");
}

async function updateCardComponent(cardComponentPath: string) {
  const src = await fs.readFile(cardComponentPath, "utf-8");

  const newSrc = src.replace(
    `backgroundColor: "white"`,
    `backgroundColor: "red"`
  );

  await fs.writeFile(cardComponentPath, newSrc);
}

function waitForCardBackgroundColor(page: Page, color: string) {
  return page.evaluate(
    ({ selector, color }) => {
      return new Promise<void>((resolve, reject) => {
        function check() {
          const el = document.querySelector(selector);

          if (!el) {
            return;
          }

          const computedStyle = window.getComputedStyle(el);

          if (computedStyle.backgroundColor === color) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        }

        check();

        setTimeout(
          () =>
            reject(new Error(`Computed backgroundColor should be ${color}`)),
          5000
        );
      });
    },
    {
      selector: CARD_SELECTOR,
      color,
    }
  );
}

function waitForCardBorderColor(page: Page, color: string) {
  return page.evaluate(
    ({ selector, color }) => {
      return new Promise<void>((resolve, reject) => {
        function check() {
          const el = document.querySelector(selector);

          if (!el) {
            return;
          }

          const computedStyle = window.getComputedStyle(el);

          if (computedStyle.borderColor === color) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        }

        check();

        setTimeout(
          () => reject(new Error(`Computed borderColor should be ${color}`)),
          5000
        );
      });
    },
    {
      selector: CARD_SELECTOR,
      color,
    }
  );
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

function retryIfErrorDoesntMatch(
  fn: () => Promise<void>,
  error: string
): Promise<void> {
  let maxRetries = 2;

  return fn().catch((err) => {
    if (!err.message.includes(error) && maxRetries > 0) {
      maxRetries--;

      return retryIfErrorDoesntMatch(fn, error);
    }

    throw err;
  });
}
