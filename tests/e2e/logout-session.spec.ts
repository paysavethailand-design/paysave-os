import { expect, test } from "@playwright/test";

const email = process.env.PAYSAVE_E2E_ADMIN_EMAIL;
const password = process.env.PAYSAVE_E2E_ADMIN_PASSWORD;
const externalBaseURL = process.env.PAYSAVE_E2E_BASE_URL;

test.describe("authenticated logout", () => {
  test.skip(
    !externalBaseURL || !email || !password,
    "Requires an approved preview URL and synthetic admin credentials",
  );

  test("waits for sign-out navigation and keeps protected routes closed", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("อีเมล").fill(email!);
    await page.getByLabel("รหัสผ่าน").fill(password!);
    await Promise.all([
      page.waitForURL(/\/dashboard\/admin$/),
      page.getByRole("button", { name: "เข้าสู่ระบบ" }).click(),
    ]);

    await page.getByRole("button", { name: /BB Admin Demo workspace/ }).click();
    await Promise.all([
      page.waitForURL(/\/sign-in(?:\?|$)/),
      page.getByRole("button", { name: "ออกจากระบบ" }).click(),
    ]);

    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fadmin$/);

    await page.reload();
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Fadmin$/);
  });
});
