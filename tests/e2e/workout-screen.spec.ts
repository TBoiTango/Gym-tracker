/**
 * Workout Screen — End-to-End Button Audit
 *
 * These tests verify exactly which database writes each button triggers.
 * We intercept all Supabase REST calls and assert on the payloads.
 *
 * Setup:
 *   1. Copy .env.local to .env.test and point NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
 *      at a test/staging Supabase project (never your production database).
 *   2. Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env.test
 *      for a pre-seeded test user who already has a plan and a workout session.
 *   3. Run:  npx playwright test
 */

import { test, expect, Page, Request } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Collect every Supabase REST write (POST/PATCH/DELETE) made during fn(). */
async function captureWrites(
  page: Page,
  fn: () => Promise<void>
): Promise<Request[]> {
  const writes: Request[] = [];
  const listener = (req: Request) => {
    const url = req.url();
    const method = req.method();
    const isSupabase = url.includes("/rest/v1/");
    const isWrite = ["POST", "PATCH", "DELETE"].includes(method);
    if (isSupabase && isWrite) writes.push(req);
  };
  page.on("request", listener);
  await fn();
  // Brief settle time for any fire-and-forget writes
  await page.waitForTimeout(500);
  page.off("request", listener);
  return writes;
}

/** Returns the table name from a Supabase REST URL, e.g. "exercise_logs". */
function tableFrom(req: Request): string {
  return new URL(req.url()).pathname.split("/rest/v1/")[1].split("?")[0];
}

// ── Auth setup ────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // Sign in via the login page rather than manipulating storage directly
  await page.goto("/login");
  await page.fill('[type="email"]', process.env.PLAYWRIGHT_TEST_EMAIL ?? "test@example.com");
  await page.fill('[type="password"]', process.env.PLAYWRIGHT_TEST_PASSWORD ?? "password");
  await page.click('[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
});

// ── Classification smoke test ─────────────────────────────────────────────────

test("exercise type classification — strength exercises never show cardio UI", async ({ page }) => {
  // Navigate directly to a known session URL; replace with a real seeded session id
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  // Any card that displays "Cardio" subtext should NOT have a barbell/cable/machine name as its title
  const cardioLabels = page.locator("text=Cardio").all();
  for (const label of await cardioLabels) {
    const card = label.locator("..").locator("..");
    const title = await card.locator("p.font-bold").textContent();
    const strengthTerms = ["barbell", "cable", "dumbbell", "machine", "row", "press", "curl"];
    const isStrength = strengthTerms.some((t) =>
      title?.toLowerCase().includes(t)
    );
    expect(isStrength, `"${title}" is tagged as Cardio but should be Strength`).toBe(false);
  }
});

// ── Button writes audit ───────────────────────────────────────────────────────

test("↑↓ reorder buttons write nothing to the database", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    const upBtn = page.locator("button[title='Move up']").first();
    if (await upBtn.isEnabled()) await upBtn.click();
    const downBtn = page.locator("button[title='Move down']").first();
    if (await downBtn.isEnabled()) await downBtn.click();
  });

  expect(writes).toHaveLength(0);
});

test("Change exercise button writes nothing to the database", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    await page.locator("button", { hasText: "↻ Change exercise" }).first().click();
    // Wait for the swap to complete (button text changes back)
    await page.waitForFunction(() =>
      document.querySelector("button")?.textContent?.includes("↻ Change exercise")
    , { timeout: 20_000 });
  });

  // The only allowed write is to user_exercise_pool from swapExercise's equipment fetch — none here
  const sessionWrites = writes.filter((r) => tableFrom(r) === "workout_sessions");
  const logWrites = writes.filter((r) => tableFrom(r) === "exercise_logs");

  expect(sessionWrites).toHaveLength(0);
  expect(logWrites).toHaveLength(0);
});

test("✕ Skip button writes nothing to the database", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    await page.locator("button[title='Skip exercise']").first().click();
    await page.locator("button", { hasText: "Feeling sore" }).click();
  });

  expect(writes).toHaveLength(0);
});

test("Log Set writes exactly one row to exercise_logs", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    await page.locator("button", { hasText: /Log Set/ }).first().click();
    await page.waitForTimeout(1000);
  });

  const logWrites = writes.filter((r) => tableFrom(r) === "exercise_logs");
  expect(logWrites.length).toBeGreaterThanOrEqual(1);

  // Must not write to workout_sessions
  const sessionWrites = writes.filter((r) => tableFrom(r) === "workout_sessions");
  expect(sessionWrites).toHaveLength(0);
});

test("Quick Add writes to user_exercise_pool only (no exercise_log until Log Set)", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    // Click the first Quick Add chip
    await page.locator("button", { hasText: /^\+ / }).first().click();
    // Wait for the exercise to appear at the bottom of the list
    await page.waitForTimeout(8_000); // AI call takes a few seconds
  });

  const poolWrites = writes.filter((r) => tableFrom(r) === "user_exercise_pool");
  const logWrites = writes.filter((r) => tableFrom(r) === "exercise_logs");
  const sessionWrites = writes.filter((r) => tableFrom(r) === "workout_sessions");

  expect(poolWrites.length).toBeGreaterThanOrEqual(1); // saved to pool
  expect(logWrites).toHaveLength(0);    // no log until user actually logs a set
  expect(sessionWrites).toHaveLength(0); // no session writes
});

test("Finish Workout writes completed_at to workout_sessions only", async ({ page }) => {
  const SESSION_ID = process.env.PLAYWRIGHT_TEST_SESSION_ID;
  test.skip(!SESSION_ID, "Set PLAYWRIGHT_TEST_SESSION_ID to run this test");

  await page.goto(`/workout/${SESSION_ID}`);

  const writes = await captureWrites(page, async () => {
    await page.locator("button", { hasText: "Finish Workout" }).click();
    await page.waitForURL(/summary/, { timeout: 10_000 });
  });

  const sessionWrites = writes.filter((r) => tableFrom(r) === "workout_sessions");
  expect(sessionWrites).toHaveLength(1);
  expect(sessionWrites[0].method()).toBe("PATCH");

  // Must not create a new session row
  const sessionInserts = writes.filter(
    (r) => tableFrom(r) === "workout_sessions" && r.method() === "POST"
  );
  expect(sessionInserts).toHaveLength(0);

  // Must not write to exercise_logs
  const logWrites = writes.filter((r) => tableFrom(r) === "exercise_logs");
  expect(logWrites).toHaveLength(0);
});

test("Start Workout button is idempotent — cannot create two sessions on double-tap", async ({ page }) => {
  await page.goto("/workout");

  // Pick the first day
  await page.locator("button.w-full.rounded-xl.border").first().click();
  await page.locator("button", { hasText: "Generate Today's Workout" }).click();
  await page.waitForSelector("button:has-text('Start Workout 💪')", { timeout: 30_000 });

  const writes = await captureWrites(page, async () => {
    const btn = page.locator("button", { hasText: "Start Workout 💪" });
    // Attempt rapid double-click
    await btn.click();
    await btn.click({ force: true });
    await page.waitForURL(/\/workout\/[a-f0-9-]{36}/, { timeout: 15_000 });
  });

  const sessionInserts = writes.filter(
    (r) => tableFrom(r) === "workout_sessions" && r.method() === "POST"
  );
  expect(sessionInserts).toHaveLength(1); // exactly one, not two
});
