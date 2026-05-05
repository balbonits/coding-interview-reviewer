import { test, expect } from "@playwright/test";

const NEW_NOTES = [
  { slug: "javascript-promises", title: /JavaScript Promises/i },
  { slug: "fetching-data", title: /Fetching Data on the Front End/i },
  { slug: "soap-and-rpc-styles", title: /SOAP, XML-RPC, JSON-RPC/i },
  { slug: "java-fundamentals", title: /Java Fundamentals/i },
  { slug: "spring-boot", title: /Spring Boot/i },
];

test.describe("New notes render", () => {
  for (const note of NEW_NOTES) {
    test(`/notes/${note.slug} renders with title`, async ({ page }) => {
      const res = await page.goto(`/notes/${note.slug}`);
      expect(res?.status(), `${note.slug} HTTP status`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: note.title }),
      ).toBeVisible();
    });
  }

  test("/notes index lists at least one of the new slugs", async ({
    page,
  }) => {
    const res = await page.goto("/notes");
    expect(res?.status()).toBe(200);
    // The index links to every note in content/notes/.
    await expect(
      page.locator('a[href="/notes/spring-boot"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/notes/java-fundamentals"]').first(),
    ).toBeVisible();
  });
});
