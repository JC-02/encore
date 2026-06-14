import { expect, test } from "@playwright/test";

test("home screen renders the wordmark and actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Encore")).toBeVisible();
  await expect(page.getByText("Host Game")).toBeVisible();
  await expect(page.getByText("Join Game")).toBeVisible();
});
