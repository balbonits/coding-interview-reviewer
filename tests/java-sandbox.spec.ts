import { test, expect } from "@playwright/test";
import { createReadySession } from "./helpers";

const SAMPLE_JAVA = `public class Main {
    public static void main(String[] args) {
        System.out.println("e2e-ok=" + (1 + 1));
    }
}
`;

test.describe("Java sandbox", () => {
  test("API: GET /api/run/java reports JDK status", async ({ request }) => {
    const res = await request.get("/api/run/java");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // JDK should be present (jenv shim → 21.0.11 in this dev env).
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/javac \d+/);
  });

  test("API: POST /api/run/java compiles + executes", async ({ request }) => {
    const res = await request.post("/api/run/java", {
      data: { code: SAMPLE_JAVA },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.phase).toBe("run");
    expect(body.className).toBe("Main");
    expect(body.stdout).toContain("e2e-ok=2");
    expect(body.exitCode).toBe(0);
    expect(body.timedOut).toBe(false);
    // Should be well under the 10s run cap.
    expect(body.durationMs).toBeLessThan(8_000);
  });

  test("API: compile error surfaces in phase=compile, ok=false", async ({
    request,
  }) => {
    const broken = `public class Broken {
        public static void main(String[] args) {
            this is not valid java
        }
    }`;
    const res = await request.post("/api/run/java", {
      data: { code: broken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.phase).toBe("compile");
    expect(body.stderr.length).toBeGreaterThan(0);
  });

  test("UI: Sandbox dropdown opens, picks Java, runs code, attaches to chat", async ({
    page,
    request,
  }) => {
    const sessionId = await createReadySession(request);

    await page.goto(`/interview/${sessionId}`);

    // Session is seeded so kickoff doesn't fire — sandbox button enables
    // immediately.
    const sandboxBtn = page.getByRole("button", { name: /sandbox/i });
    await expect(sandboxBtn).toBeVisible({ timeout: 15_000 });
    await expect(sandboxBtn).toBeEnabled({ timeout: 5_000 });

    await sandboxBtn.click();

    // Menu items have role=menuitem; locate by their unique subtitle text.
    // (The accessible name is the concatenation of label + subtitle spans,
    // so we match against the subtitle which is more specific.)
    const javaItem = page
      .getByRole("menuitem")
      .filter({ hasText: "javac + java via local JDK" });
    await expect(javaItem).toBeVisible();

    await javaItem.click();

    // Java sandbox header proves the panel mounted.
    await expect(page.getByText(/Java sandbox/i)).toBeVisible();

    // The Java code textarea is the unique spellcheck=false textarea on the
    // page (chat input doesn't set the attribute).
    const codeArea = page.locator('textarea[spellcheck="false"]').first();
    await expect(codeArea).toBeVisible();
    await codeArea.fill(SAMPLE_JAVA);

    // Click Run; the button text flips to "Running…" via useTransition.
    const runBtn = page.getByRole("button", { name: /^Run$/i });
    await runBtn.click();

    // Output panel should eventually show our marker.
    await expect(page.getByText(/e2e-ok=2/)).toBeVisible({ timeout: 30_000 });

    // Attach to message; the input textarea should now contain the code.
    await page
      .getByRole("button", { name: /Attach to message/i })
      .click();
    const inputArea = page.getByPlaceholder(/Type your answer/i);
    await expect(inputArea).toContainText(/Submitted via Java sandbox/i);
    await expect(inputArea).toContainText(/public class Main/i);
  });
});

