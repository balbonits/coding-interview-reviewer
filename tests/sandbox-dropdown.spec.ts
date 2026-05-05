import { test, expect } from "@playwright/test";
import { createReadySession } from "./helpers";

test.describe("Sandbox dropdown", () => {
  test("dropdown shows both menu items with subtitles", async ({
    page,
    request,
  }) => {
    const sessionId = await createReadySession(request);
    await page.goto(`/interview/${sessionId}`);

    const sandboxBtn = page.getByRole("button", { name: /sandbox/i });
    await expect(sandboxBtn).toBeEnabled({ timeout: 15_000 });
    await sandboxBtn.click();

    // Menu container.
    await expect(
      page.getByRole("menu", { name: /Choose a sandbox/i }),
    ).toBeVisible();

    // Both items present, identified by their unique subtitles.
    await expect(
      page.getByRole("menuitem").filter({ hasText: "Sandpack — runs in browser" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem").filter({ hasText: "javac + java via local JDK" }),
    ).toBeVisible();
  });

  test("JS option mounts the Sandpack panel with template picker", async ({
    page,
    request,
  }) => {
    const sessionId = await createReadySession(request);
    await page.goto(`/interview/${sessionId}`);

    await page.getByRole("button", { name: /sandbox/i }).click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: "Sandpack — runs in browser" })
      .click();

    // The Sandpack panel includes a "Template:" label above the picker.
    await expect(page.getByText(/^Template:/)).toBeVisible({ timeout: 15_000 });

    // All five template buttons should be present.
    for (const t of ["JS", "TS", "React", "React TS", "Node"]) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${t}$`) }),
      ).toBeVisible();
    }

    // Cancel closes the panel; button label flips back from "Close JS" to
    // "Sandbox".
    await page.getByRole("button", { name: /^Cancel$/ }).click();
    await expect(page.getByText(/^Template:/)).not.toBeVisible();
  });

  test("opening Java closes the JS panel (mutual exclusion)", async ({
    page,
    request,
  }) => {
    const sessionId = await createReadySession(request);
    await page.goto(`/interview/${sessionId}`);

    // Open JS first.
    await page.getByRole("button", { name: /sandbox/i }).click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: "Sandpack — runs in browser" })
      .click();
    await expect(page.getByText(/^Template:/)).toBeVisible({ timeout: 15_000 });

    // Now the trigger says "Close JS" — first click closes JS, second click
    // re-opens the menu where we can pick Java. Test the full flow.
    await page.getByRole("button", { name: /Close JS/i }).click();
    await expect(page.getByText(/^Template:/)).not.toBeVisible();

    await page.getByRole("button", { name: /sandbox/i }).click();
    await page
      .getByRole("menuitem")
      .filter({ hasText: "javac + java via local JDK" })
      .click();

    // Java panel mounted; JS panel gone.
    await expect(page.getByText(/Java sandbox/i)).toBeVisible();
    await expect(page.getByText(/^Template:/)).not.toBeVisible();
  });
});
