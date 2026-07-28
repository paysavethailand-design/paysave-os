import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.FRONTEND_QA_BASE_URL ?? "http://127.0.0.1:3100";
const evidenceDir = path.resolve("docs/frontend/evidence/frontend-sprint-1");
await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {
  baseURL,
  generatedAt: new Date().toISOString(),
  pages: [],
  externalRequests: [],
  consoleErrors: [],
  pageErrors: [],
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
});
const page = await context.newPage();
page.on("request", (request) => {
  const url = new URL(request.url());
  if (!["127.0.0.1", "localhost"].includes(url.hostname))
    results.externalRequests.push(request.url());
});
page.on("console", (message) => {
  if (message.type() === "error") results.consoleErrors.push(message.text());
});
page.on("pageerror", (error) => results.pageErrors.push(error.message));

async function auditPage(name, screenshot, expectedHeading) {
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: expectedHeading }).waitFor();
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((item) =>
    ["serious", "critical"].includes(item.impact ?? ""),
  );
  await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
  results.pages.push({
    name,
    url: page.url(),
    overflow,
    seriousViolations: serious.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      nodes: nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })),
  });
}

await page.goto(`${baseURL}/login`);
await auditPage("login-desktop", "01-login-desktop.png", "ยินดีต้อนรับ");
await page.getByLabel("อีเมล").fill("invalid");
await page.getByLabel("รหัสผ่าน").fill("short");
await page.getByRole("button", { name: /เข้าสู่ Mock Workspace/ }).click();
await page.getByRole("alert").first().waitFor();
await page.getByLabel("อีเมล").fill("demo@paysave.local");
await page.getByLabel("รหัสผ่าน").fill("MockOnly123!");
await page.getByRole("button", { name: /เข้าสู่ Mock Workspace/ }).click();
await page.waitForURL("**/dashboard/executive");
await auditPage(
  "executive-desktop",
  "02-executive-desktop.png",
  "ภาพรวมธุรกิจที่ตัดสินใจได้ใน 3 วินาที",
);
if ((await page.locator('[aria-label="Key performance indicators"] > *').count()) !== 4)
  throw new Error("Executive KPI count is not 4");
await page.getByRole("button", { name: "เปิดการแจ้งเตือน" }).click();
await page.getByText("Notification Center").waitFor();
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "สลับธีม" }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(evidenceDir, "03-executive-dark.png"), fullPage: true });

const dashboards = [
  ["partner", "Partner Operations Dashboard"],
  ["admin", "Identity, access และระบบพร้อมใช้งาน"],
  ["field", "งานวันนี้ ชัดเจน พร้อมออกพื้นที่"],
];
for (const [persona, heading] of dashboards) {
  await page.goto(`${baseURL}/dashboard/${persona}`);
  await auditPage(`${persona}-desktop`, `04-${persona}-desktop.png`, heading);
}
await context.close();

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
});
const mobile = await mobileContext.newPage();
mobile.on("request", (request) => {
  const url = new URL(request.url());
  if (!["127.0.0.1", "localhost"].includes(url.hostname))
    results.externalRequests.push(request.url());
});
mobile.on("console", (message) => {
  if (message.type() === "error") results.consoleErrors.push(message.text());
});
mobile.on("pageerror", (error) => results.pageErrors.push(error.message));
await mobile.goto(`${baseURL}/dashboard/executive`);
await mobile.waitForLoadState("networkidle");
await mobile.getByRole("heading", { name: "ภาพรวมธุรกิจที่ตัดสินใจได้ใน 3 วินาที" }).waitFor();
const mobileOverflow = await mobile.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
const mobileAxe = await new AxeBuilder({ page: mobile }).analyze();
const mobileSerious = mobileAxe.violations.filter((item) =>
  ["serious", "critical"].includes(item.impact ?? ""),
);
await mobile.screenshot({
  path: path.join(evidenceDir, "05-executive-mobile.png"),
  fullPage: true,
});
await mobile.getByRole("button", { name: "เปิดเมนู" }).click();
await mobile.getByRole("navigation", { name: "Dashboard personas" }).waitFor();
await mobile.screenshot({ path: path.join(evidenceDir, "06-mobile-sidebar.png"), fullPage: false });
results.pages.push({
  name: "executive-mobile",
  url: mobile.url(),
  overflow: mobileOverflow,
  seriousViolations: mobileSerious.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    nodes: nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  })),
});
await mobileContext.close();
await browser.close();

results.externalRequests = [...new Set(results.externalRequests)];
results.consoleErrors = [...new Set(results.consoleErrors)];
results.pageErrors = [...new Set(results.pageErrors)];
await writeFile(path.join(evidenceDir, "qa-results.json"), `${JSON.stringify(results, null, 2)}\n`);

const failures = [];
for (const item of results.pages) {
  if (item.overflow.scrollWidth > item.overflow.innerWidth)
    failures.push(`${item.name}: document horizontal overflow`);
  if (item.seriousViolations.length) failures.push(`${item.name}: serious/critical axe violations`);
}
if (results.externalRequests.length) failures.push("External network requests detected");
if (results.consoleErrors.length) failures.push("Browser console errors detected");
if (results.pageErrors.length) failures.push("Uncaught page errors detected");
if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", failures, results }, null, 2));
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      status: "PASS",
      pages: results.pages.length,
      externalRequests: 0,
      consoleErrors: 0,
      pageErrors: 0,
      evidenceDir,
    },
    null,
    2,
  ),
);
