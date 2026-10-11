import { expect, test } from "@playwright/test";

test("new workspaces fit all requested widths and expose keyboard navigation", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of [
      "/",
      "/overview",
      "/strategy",
      "/simulation",
      "/observations",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      if (
        (width === 1440 && ["/", "/overview", "/strategy"].includes(route)) ||
        (width === 375 && route === "/")
      ) {
        await page.screenshot({
          path: `/tmp/afterbells-${route === "/" ? "desk" : route.slice(1)}-${width}.png`,
          fullPage: true,
        });
        await page.screenshot({
          path: `/tmp/afterbells-${route === "/" ? "desk" : route.slice(1)}-${width}-viewport.png`,
        });
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.goto("/overview");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("strategy interpretation requires explicit application and zero tolerance survives", async ({
  page,
}) => {
  await page.route("**/api/plans", (route) =>
    route.fulfill({ json: { plans: [] } }),
  );
  await page.route("**/api/plans/parse-intent", (route) =>
    route.fulfill({
      json: {
        ticker: "AAPL",
        amount_usdt: 10,
        cron: "0 10 * * 1",
        tolerance_bps: 0,
        window_hours: 12,
        must_buy: false,
      },
    }),
  );
  await page.goto("/strategy");
  await page
    .getByRole("button", { name: "Interpret intent", exact: true })
    .click();
  await expect(
    page.getByLabel("Underlying ticker", { exact: true }),
  ).toHaveValue("NVDA");
  await page
    .getByRole("button", { name: "Apply interpretation to draft" })
    .click();
  await expect(
    page.getByLabel("Underlying ticker", { exact: true }),
  ).toHaveValue("AAPL");
  await expect(
    page.getByLabel("Cost tolerance (bps)", { exact: true }),
  ).toHaveValue("0");
  await page.route("**/api/plans", (route) =>
    route.fulfill({
      status: 422,
      json: { detail: "Schedule rejected by backend" },
    }),
  );
  await page.getByRole("button", { name: "Save recurring plan" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Schedule rejected by backend",
  );
  await expect(page.getByText("Plan saved.", { exact: false })).toHaveCount(0);
});

test("replay lab verifies a real recorded receipt and blocks tampered comparison", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/decisions", {
    data: { text: "Buy $10 of NVDA", mode: "recorded" },
  });
  expect(response.ok()).toBe(true);
  const receipt = await response.json();
  await page.goto("/simulation");
  await page.getByLabel("Decision receipt JSON").fill(JSON.stringify(receipt));
  await page.getByRole("button", { name: "Verify & replay receipt" }).click();
  await expect(page.getByRole("status")).toContainText("MATCH");
  await page
    .getByRole("button", { name: "Compare policy", exact: true })
    .click();
  await expect(page.getByText("NO_VALID_ROUTE", { exact: true })).toBeVisible();
  receipt.intent.notional = "999";
  await page.getByLabel("Decision receipt JSON").fill(JSON.stringify(receipt));
  await page.getByRole("button", { name: "Verify & replay receipt" }).click();
  await expect(page.getByRole("status")).toContainText("MISMATCH");
  await expect(
    page.getByRole("button", { name: "Compare policy", exact: true }),
  ).toHaveCount(0);
});

test("empty probes never invent financial observations", async ({ page }) => {
  await page.route("**/api/samples", (route) =>
    route.fulfill({ json: { samples: [] } }),
  );
  await page.goto("/observations");
  await expect(
    page.getByRole("heading", { name: "No observations available" }),
  ).toBeVisible();
  await expect(page.locator(".workspace-metric").nth(1)).toContainText(
    "Unknown",
  );
  await expect(page.locator(".workspace-metric").nth(2)).toContainText(
    "Unknown",
  );
});
