import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(process.env.QA_PACKAGE_JSON || "/tmp/education-finance-qa/package.json");
const { chromium } = require("playwright");
const browser = await chromium.launch({headless:true});
const context = await browser.newContext();
const page = await context.newPage(), failures = [];
page.on("pageerror", (e) => failures.push(e.message));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) failures.push(r.status() + " " + r.url()); });
const url = process.env.QA_URL || "http://127.0.0.1:8765/education-finance/";
try {
  await page.goto(url);
  await page.locator('[data-funding="balance"]').fill("54321");
  await page.locator('[data-cost="tuition"]').fill("12000");
  await page.locator('[data-cost="housing"]').fill("13000");
  await page.locator("#example").click();
  await page.locator("#calculate").click();
  await page.waitForFunction(() => !document.querySelector("#results-content").hidden &&
    document.querySelector("#results-content").textContent.length > 200, null, {timeout:180000});
  await page.waitForFunction(() => document.querySelector("#run-status").hidden, null, {timeout:180000});
  const summary = page.locator("#forecast-evidence > summary");
  await summary.focus(); await page.keyboard.press("Space");
  assert.equal(await page.locator("#forecast-evidence").evaluate((el) => el.open), true);
  mkdirSync("tests/evidence/followup", {recursive:true});
  const checks = [];
  for (const [name,width,height] of [["phone",390,844],["ipad",1024,768],["desktop",1440,1000]]) {
    await page.setViewportSize({width,height});
    const layout = await page.evaluate(() => ({
      client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth }));
    assert.ok(layout.scroll <= layout.client + 1, name + " page overflow");
    await page.locator("#forecast-evidence").scrollIntoViewIfNeeded();
    await page.screenshot({path:"tests/evidence/followup/" + name + ".png",fullPage:true});
    checks.push({name,width,height,...layout});
  }
  await page.locator("#exit-example").click();
  assert.equal(await page.locator('[data-funding="balance"]').inputValue(), "54321");
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-funding="balance"]').value === "54321");
  assert.deepEqual(failures, []);
  const result = {url, checks, keyboardDisclosure:true, workerAssessment:true,
    exampleRestoredFunding:true, reloadPreservedFunding:true, browser:"Chromium",
    physicalSafariVerified:false};
  writeFileSync("tests/evidence/followup/browser.json",JSON.stringify(result,null,2)+"\n");
  console.log("BROWSER_RESULT " + JSON.stringify(result));
} finally { await browser.close(); }
