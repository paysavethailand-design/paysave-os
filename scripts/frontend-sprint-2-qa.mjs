import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.FRONTEND_QA_URL ?? "http://127.0.0.1:3100";
const evidenceDir = path.resolve("docs/frontend/evidence/frontend-sprint-2");
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const externalRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) externalRequests.push(request.url());
});

const results = [];
async function audit(name, url, screenshot, options = {}) {
  await page.goto(`${baseURL}${url}`, { waitUntil: "networkidle" });
  await page
    .locator("[aria-busy=true]")
    .waitFor({ state: "detached", timeout: 5000 })
    .catch(() => {});
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((item) =>
    ["serious", "critical"].includes(item.impact ?? ""),
  );
  await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: true });
  results.push({
    name,
    url,
    overflow,
    serious: serious.map(({ id, impact, help, nodes }) => ({
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
  if (options.heading) await page.getByRole("heading", { name: options.heading }).waitFor();
}

await audit("case-list-desktop", "/recovery/cases", "01-case-list-desktop.png", {
  heading: "Case List",
});
await page.getByLabel("ค้นหาเคส").fill("ไม่มีเคสนี้");
await page.getByText("ไม่พบ Recovery Case").waitFor();
await page.getByLabel("ค้นหาเคส").fill("");
await page.getByRole("link", { name: "RC-2026-0018" }).waitFor();

await audit("case-detail-desktop", "/recovery/cases/RC-2026-0018", "02-case-detail-desktop.png", {
  heading: "กิตติศักดิ์ พรหมมา",
});
await page.getByRole("button", { name: "บันทึกการติดต่อ" }).click();
await page.getByLabel("รายละเอียด").fill("ยืนยันนัดชำระผ่าน Mock API");
await page.getByRole("button", { name: "บันทึก Contact Attempt" }).click();
await page.getByText("ยืนยันนัดชำระผ่าน Mock API").first().waitFor();

await page.getByRole("button", { name: "Promise to Pay" }).click();
await page.getByLabel("หมายเหตุ").fill("นัดชำระงวดแรกแบบ Mock");
await page.getByRole("button", { name: "ยืนยัน Promise to Pay" }).click();
await page.getByText("นัดชำระงวดแรกแบบ Mock").waitFor();

await page.getByRole("button", { name: "Field Visit" }).click();
await page.getByLabel("รายละเอียด").fill("ตรวจพิกัดและทรัพย์สินจำลองแล้ว");
await page.getByRole("button", { name: "บันทึก Field Visit" }).click();
await page.getByText("ตรวจพิกัดและทรัพย์สินจำลองแล้ว").first().waitFor();

await page.getByRole("button", { name: "พิจารณาคำขอ" }).click();
await page.getByLabel("เหตุผลประกอบการพิจารณา").fill("อนุมัติตามหลักฐานจำลองครบถ้วน");
await page.getByRole("button", { name: "อนุมัติ", exact: true }).click();
await page.getByText("Approval Result").waitFor();

await page.locator('button[aria-label^="เปิด สัญญาเช่าซื้อ"]').click();
await page.getByRole("dialog").waitFor();
const dialogAxe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
results.push({
  name: "document-viewer-dialog",
  serious: dialogAxe.violations
    .filter((item) => ["serious", "critical"].includes(item.impact ?? ""))
    .map(({ id, impact, help, nodes }) => ({ id, impact, help, nodes: nodes.length })),
});
await page.getByRole("button", { name: "หน้าถัดไป" }).click();
await page.getByText("หน้า 2 / 6").waitFor();
await page.keyboard.press("Escape");

await audit("assignment-desktop", "/recovery/assignments", "03-assignment-desktop.png", {
  heading: "Assignment Screen",
});
await page.getByRole("button", { name: /RC-2026-0015/ }).click();
await page.getByRole("button", { name: /^ชว ชลธิชา วงศ์ดี/ }).click();
await page.getByRole("button", { name: "มอบหมายทันที" }).click();
await page.getByText("Optimistic update").waitFor({ timeout: 250 });
await page.getByText("ชลธิชา วงศ์ดี").last().waitFor();

await page.goto(`${baseURL}/recovery/cases/RC-2026-0018`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "สลับธีม" }).click();
await page.locator("html.dark").waitFor();
const darkAxe = await new AxeBuilder({ page }).analyze();
results.push({
  name: "case-detail-dark",
  serious: darkAxe.violations
    .filter((item) => ["serious", "critical"].includes(item.impact ?? ""))
    .map(({ id, impact, help, nodes }) => ({ id, impact, help, nodes: nodes.length })),
});
await page.screenshot({ path: path.join(evidenceDir, "04-case-detail-dark.png"), fullPage: true });

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${baseURL}/recovery/cases`, { waitUntil: "networkidle" });
await mobile
  .locator("[aria-busy=true]")
  .waitFor({ state: "detached", timeout: 5000 })
  .catch(() => {});
const mobileOverflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
const mobileAxe = await new AxeBuilder({ page: mobile }).analyze();
await mobile.screenshot({
  path: path.join(evidenceDir, "05-case-list-mobile.png"),
  fullPage: true,
});
await mobile.getByRole("button", { name: "เปิดเมนู" }).click();
await mobile.getByRole("dialog").waitFor();
await mobile.screenshot({
  path: path.join(evidenceDir, "06-mobile-navigation.png"),
  fullPage: false,
});
results.push({
  name: "case-list-mobile",
  overflow: mobileOverflow,
  serious: mobileAxe.violations
    .filter((item) => ["serious", "critical"].includes(item.impact ?? ""))
    .map(({ id, impact, help, nodes }) => ({ id, impact, help, nodes: nodes.length })),
});

const report = {
  status:
    results.every((item) => !item.overflow && item.serious.length === 0) &&
    externalRequests.length === 0 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
      ? "PASS"
      : "FAIL",
  pages: results,
  externalRequests: [...new Set(externalRequests)],
  consoleErrors,
  pageErrors,
};
await writeFile(path.join(evidenceDir, "qa-results.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      status: report.status,
      checks: results.length,
      externalRequests: report.externalRequests.length,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      evidenceDir,
    },
    null,
    2,
  ),
);
await browser.close();
if (report.status !== "PASS") process.exitCode = 1;
