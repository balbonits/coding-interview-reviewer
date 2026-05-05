import { test, expect } from "@playwright/test";

async function readCssVar(
  page: import("@playwright/test").Page,
  name: string,
): Promise<string> {
  return await page.evaluate(
    (n) => document.documentElement.style.getPropertyValue(n).trim(),
    name,
  );
}

test.describe("Typography settings", () => {
  // Each Playwright test gets a fresh browser context, so localStorage is
  // already isolated between tests — no manual clearing needed.

  test("popover opens; size + family selections apply CSS vars", async ({
    page,
  }) => {
    await page.goto("/");

    // The trigger has aria-label "Typography settings".
    const trigger = page.getByRole("button", {
      name: /typography settings/i,
    });
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Popover (role="dialog") should be visible.
    const dialog = page.getByRole("dialog", { name: /typography settings/i });
    await expect(dialog).toBeVisible();

    // Pick "Large" — the component sets --app-font-size to 18px.
    await dialog.getByRole("button", { name: /^Large$/ }).click();
    expect(await readCssVar(page, "--app-font-size")).toBe("18px");

    // Pick "Hyperlegible" — sets --app-font-family to a stack referencing
    // var(--font-atkinson).
    await dialog.getByRole("button", { name: /Hyperlegible/i }).click();
    const fam = await readCssVar(page, "--app-font-family");
    expect(fam).toContain("--font-atkinson");
  });

  test("settings persist across reload (FOUC-free init applies them)", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /typography settings/i }).click();
    const dialog = page.getByRole("dialog", { name: /typography settings/i });
    await dialog.getByRole("button", { name: /^Compact$/ }).click();
    // Font buttons render "Serif Aa" (label + sample) so the accessible
    // name is the concatenation. Anchor only at start.
    await dialog.getByRole("button", { name: /^Serif\b/ }).click();

    // Reload — the inline <head> script should re-apply the vars before
    // first paint, so they're set as soon as the document is interactive.
    await page.reload();

    expect(await readCssVar(page, "--app-font-size")).toBe("14px");
    expect(await readCssVar(page, "--app-font-family")).toContain("Georgia");
  });

  test("Escape closes the popover", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /typography settings/i }).click();
    const dialog = page.getByRole("dialog", { name: /typography settings/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
