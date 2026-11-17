import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(process.env.QA_PACKAGE_JSON || "/tmp/education-finance-qa/package.json");
const { chromium } = require("playwright");
const browser = await chromium.launch({headless:true, ...(process.env.QA_BROWSER ? {executablePath:process.env.QA_BROWSER} : {})});
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
  await page.locator(".family-overview > summary").click();
  await page.locator("#household-limit").fill("500");
  await page.locator("#calculate").click();
  await page.waitForFunction(() => !document.querySelector("#results-content").hidden &&
    document.querySelector("#results-content").textContent.length > 200, null, {timeout:180000});
  await page.waitForFunction(() => document.querySelector("#run-status").hidden, null, {timeout:180000});
  assert.ok(await page.locator("#results-content").getByText("Affordable annual budget · median path",{exact:true}).count());
  assert.ok(await page.locator("#results-content").getByText("Required household deposits",{exact:true}).count());
  const calibrationReview=page.locator("#current-calibration-evidence > summary");
  await calibrationReview.focus();await page.keyboard.press("Space");
  assert.equal(await page.locator("#current-calibration-evidence").evaluate(el=>el.open),true);
  assert.ok(await page.getByText("Current-model prospective record",{exact:true}).count());
  assert.ok(await page.getByText("Individual-school costs · current baseline · all observed starts",{exact:true}).count());
  const costReview = page.getByText("Earlier sector-index comparison & school variation",{exact:true});
  await costReview.focus();await page.keyboard.press("Space");
  assert.ok(await page.getByText("Coherent candidate",{exact:true}).count());
  const stressReview=page.getByText("Planning stresses · same sampled paths",{exact:true});
  await stressReview.focus();await page.keyboard.press("Space");
  assert.ok(await page.getByText("Remaining grants removed",{exact:true}).count());
  const decisions=page.locator(".decision-scenarios > summary");
  await decisions.focus();await page.keyboard.press("Space");
  assert.equal(await page.locator(".decision-scenarios").evaluate(el=>el.open),true);
  assert.ok(await page.getByText("One extra attendance year",{exact:true}).count());
  const boundary=page.getByText("Decision-boundary historical evidence",{exact:true});
  await boundary.focus();await page.keyboard.press("Space");
  assert.equal(await boundary.evaluate(el=>el.parentElement.open),true);
  assert.ok(await page.getByText("Individual decision-boundary evidence",{exact:true}).count());
  const policies=page.locator(".deposit-policies > summary");
  await policies.focus();await page.keyboard.press("Space");
  assert.equal(await page.locator(".deposit-policies").evaluate(el=>el.open),true);
  assert.ok(await page.getByText("Dated-bill priority",{exact:true}).count());
  const exported=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export assessment JSON",exact:true}).click();
  const download=await exported,stream=await download.createReadStream(),chunks=[];
  for await (const chunk of stream)chunks.push(chunk);
  const assessment=JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(assessment.decisions.version,"funding-decisions-1.0.0");
  assert.equal(assessment.household.decisionPolicies.policies.length,2);
  const [fixed,priority]=assessment.household.decisionPolicies.policies;
  assert.equal(fixed.deposits,priority.deposits);
  assert.ok(fixed.peak<=500 && priority.peak<=500);
  assert.deepEqual(fixed.referenceSchedule.map(r=>r.amount),priority.referenceSchedule.map(r=>r.amount));
  const archived=page.getByText("Archived component checks · model 9",{exact:true});
  assert.equal(await archived.evaluate(el=>el.parentElement.open),false);
  assert.equal(await page.getByText("Separate histories · current model",{exact:true}).count(),0);
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
  const result = {url, checks, keyboardDisclosure:true, workerAssessment:true, decisionAlternatives:true, depositPolicyComparison:true, decisionExport:true, affordableBudget:true, householdProposal:true, costCandidateEvidence:true, matchedPlanningStresses:true, archivedPolicyLabels:true, currentSchoolCalibration:true, currentFundingCalibration:true, prospectiveMissingness:true,
    exampleRestoredFunding:true, reloadPreservedFunding:true, browser:"Chromium",
    physicalSafariVerified:false};
  writeFileSync("tests/evidence/followup/browser.json",JSON.stringify(result,null,2)+"\n");
  console.log("BROWSER_RESULT " + JSON.stringify(result));
} finally { await browser.close(); }
