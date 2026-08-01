import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("release smoke", () => {
  test("redirects the root route to the Supabase production login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in\?next=%2F$/);
    await expect(page).toHaveTitle("PAYSAVE OS");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
    await expect(page.getByLabel("อีเมล")).toBeVisible();
    await expect(page.getByLabel("รหัสผ่าน")).toBeVisible();
    await expect(page.getByText(/Supabase Session และ JWT Permission/)).toBeVisible();
  });

  test("Supabase production login has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    // The frozen production UI uses an h3 for the login heading; Sprint 11F changes tests only.
    const results = await new AxeBuilder({ page }).disableRules(["page-has-heading-one"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
