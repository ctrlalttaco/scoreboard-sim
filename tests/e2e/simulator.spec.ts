import { expect, test } from "@playwright/test";

test("completes a source-backed hockey goal and SOG flow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Legacy Scoreboard Console Trainer" }),
  ).toBeVisible();

  await expect(page.getByLabel("Rink configuration")).toHaveValue(
    "hockey-sog-game",
  );
  await page.getByRole("button", { name: "Home score plus 1" }).click();
  await page.getByRole("button", { name: "Home shots on goal plus 1" }).click();
  await expect(page.getByTestId("home-score")).toHaveText("1");
  await expect(page.getByTestId("home-shots")).toHaveText("1");
});

test("fits a phone viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("publishes install metadata and registers the offline worker", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    /\/manifest\.webmanifest$/,
  );
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBe(true);
});

test("reopens after a first visit while offline", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(browserName !== "chromium", "Offline emulation is Chromium-only.");

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);

  try {
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Legacy Scoreboard Console Trainer",
      }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
