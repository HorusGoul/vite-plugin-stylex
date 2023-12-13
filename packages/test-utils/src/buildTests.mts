import { Page } from "playwright-webkit";
import { CARD_SELECTOR } from "./devTests.mjs";

export async function builtStylesGetAppliedTest(page: Page) {
  await page.waitForSelector(CARD_SELECTOR, {
    state: "visible",
  });

  await page.$eval(CARD_SELECTOR, (el) => {
    // Computed backgroundColor should be white

    return new Promise<void>(async (resolve, reject) => {
      function check() {
        const computedStyle = window.getComputedStyle(el);

        if (computedStyle.backgroundColor === "rgb(255, 255, 255)") {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      }

      check();
      setTimeout(
        () => reject(new Error("Computed backgroundColor should be white")),
        5000
      );
    });
  });
}
