import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("release smoke", () => {
  test("redirects the root route to the isolated mock login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle(/Mock Login \| PAYSAVE OS/);
    await expect(page.getByText(/Mock environment · No Supabase · No Database/)).toBeVisible();
  });

  test("mock login has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
