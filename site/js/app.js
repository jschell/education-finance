import { COST_PRESETS, applyCostPreset } from "./cost-presets.js?v=0.9.0";
import { sessionSeed, updateSessionSeed } from "./session-seed.js?v=0.9.0";
import {
  MODEL,
  PRNG,
  ASSUMPTIONS,
  clone,
  id,
  newPlan,
  newStudent,
  defaultScenario,
  duplicateStudent,
  validatePlan,
  exportPlan,
  parseImport,
  currentMonth,
  monthText,
  month,
  assumptionKeys,
  pick,
  expenseKeys,
  investmentKeys,
} from "./domain.js?v=0.9.0";
import { PROFILES, periodLabel } from "./history-config.js?v=0.9.0";
import { compile, runPath, annualRows } from "./engine.js?v=0.9.0";
import {
  savePlan,
  loadPlan,
  clearPlan,
  saveRecovery,
  loadRecovery,
  markRecoverySaved,
  clearRecovery,
  acquireEditor,
  saveDraft,
  loadDraft,
  clearDraft,
  resetIncompatibleStorage,
} from "./storage.js?v=0.9.0";
import {
  el,
  money,
  table,
  deterministicView,
  simulationView,
  comparisonView,
  historyContextView,
  calibrationContextView,
  annualFundingView,
  familyCalendarView,
  householdView,
  csvText,
} from "./render.js?v=0.9.0";
const $ = (s) => document.querySelector(s),
  form = $("#planner");
const editing = await acquireEditor().catch((error) => ({
  editable: false,
  reason: `Safe editing unavailable: ${error.message}`,
}));
let plan = newPlan(),
  studentId = plan.students[0].id,
  scenarioId = plan.students[0].scenarios[0].id;
let revision = 0,
  dirty = false,
  worker = null,
  runId = 0,
  lastResult = null,
  pendingImport = null,
  assumptionEdited = false,
  refreshTimer = null,
  exampleWorkspace = null,
  saveQueued = false,
  saveQueue = Promise.resolve(),
  saveEpoch = 0;
let currentSeed = sessionSeed();
$("#seed").value = String(currentSeed);
$("#seed").addEventListener("input", () => {
  const input = $("#seed");
  if (input.value !== "" && input.checkValidity())
    currentSeed = updateSessionSeed(input.valueAsNumber);
});
const student = () => plan.students.find((s) => s.id === studentId),
  scenario = () => student().scenarios.find((s) => s.id === scenarioId),
  funding = () => student().funding;
const message = (text, error = false) => {
  $("#message").textContent = text;
  $("#message").classList.toggle("error", error);
};
function saveStatus(text, error = false) {
  $("#save-state").textContent = text;
  $("#save-state").classList.toggle("error", error);
}
function persistSnapshot() {
  if (exampleWorkspace || !editing.editable) return Promise.resolve();
  const snapshot = clone(plan),
    selection = { studentId, scenarioId },
    savedRevision = revision,
    epoch = saveEpoch,
    signature = JSON.stringify(snapshot);
  let token = null;
  try {
    token = saveRecovery(snapshot, selection);
    clearDraft();
  } catch {
    try {
      clearRecovery();
    } catch {}
  }
  saveStatus("Saving automatically…");
  const job = saveQueue
    .catch(() => {})
    .then(async () => {
      if (epoch !== saveEpoch) return;
      await savePlan(snapshot);
      if (token) {
        try {
          markRecoverySaved(token);
        } catch {}
      }
      if (
        exampleWorkspace &&
        exampleWorkspace.revision === savedRevision &&
        JSON.stringify(exampleWorkspace.plan) === signature
      ) {
        exampleWorkspace.dirty = false;
        exampleWorkspace.saveState = "Saved in this browser";
      } else if (
        !exampleWorkspace &&
        epoch === saveEpoch &&
        revision === savedRevision &&
        JSON.stringify(plan) === signature
      ) {
        dirty = false;
        saveStatus("Saved in this browser");
      }
    });
  saveQueue = job;
  return job.catch((error) => {
    if (!exampleWorkspace && epoch === saveEpoch && revision === savedRevision)
      saveStatus(
        token
          ? "Recovery copy saved; retry Save now"
          : "Not saved — retry Save now or export",
        true,
      );
    throw error;
  });
}
function checkpoint() {
  if (exampleWorkspace || !editing.editable || !dirty) return;
  let draftSaved = false;
  try {
    saveDraft(plan, { studentId, scenarioId }, rawFields(), {
      gifts: $("#gifts").children.length,
      allocations: $("#allocation-changes").children.length,
    });
    draftSaved = true;
  } catch {}
  try {
    commit({ normalize: false, report: false });
    return persistSnapshot();
  } catch {
    saveStatus(
      draftSaved
        ? "Unfinished draft saved — complete highlighted fields to calculate"
        : "Draft not saved — storage unavailable",
      !draftSaved,
    );
  }
}
function rawFields() {
  return [...form.querySelectorAll("input,select")].map((n) => ({
    key: n.id || JSON.stringify(n.dataset),
    value: n.value,
    checked: n.checked === true,
  }));
}
function restoreFields(draft) {
  $("#gifts").replaceChildren(
    ...Array.from({ length: draft.structure.gifts }, () => giftRow()),
  );
  $("#allocation-changes").replaceChildren(
    ...Array.from({ length: draft.structure.allocations }, () =>
      allocationRow(),
    ),
  );
  const fields = [...form.querySelectorAll("input,select")];
  if (fields.length !== draft.fields.length)
    throw Error("Draft controls have changed; last valid plan retained.");
  fields.forEach((n, i) => {
    const field = draft.fields[i];
    if (field.key !== (n.id || JSON.stringify(n.dataset)))
      throw Error("Draft field no longer matches.");
  });
  fields.forEach((n, i) => {
    n.value = draft.fields[i].value;
    if (n.type === "checkbox") n.checked = draft.fields[i].checked;
  });
  const share = form.querySelector("[data-funding=share]");
  share.disabled =
    form.querySelector("[data-funding=coverage]").value !== "percent";
}
function scheduleSave() {
  if (saveQueued || exampleWorkspace) return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    checkpoint()?.catch(() => {});
  });
}
function cancel(show = false) {
  if (worker) {
    worker.terminate();
    worker = null;
    runId++;
    if (show) message("Simulation cancelled. Inputs are unchanged.");
  }
  $("#run-status").hidden = true;
}
function calculationStatus(text, error = false) {
  let status = $("#calculation-status");
  // Tolerate an older cached HTML shell during an asset update.
  if (!status) {
    status = el("p", "", "calculation-status");
    status.id = "calculation-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    $(".run-controls").before(status);
  }
  status.textContent = text;
  status.classList.toggle("error", error);
  if (lastResult && !$("#results-content").hidden) {
    const link = el("a", error ? "View previous results" : "View results");
    link.href = "#results-content";
    status.append(" ", link);
  }
}
function clearRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = null;
}
function invalidate() {
  clearRefresh();
  cancel();
  // Keep the last complete result visible; never replace it with an empty panel.
  const target = $("#results-content");
  if (lastResult && !target.hidden) {
    target.dataset.stale = "true";
    if (!target.querySelector(".stale-notice"))
      target.prepend(
        el(
          "p",
          "Inputs changed. These results are from the previous assessment.",
          "callout warning stale-notice",
        ),
      );
    target.querySelectorAll(".actions button").forEach((button) => {
      button.disabled = true;
    });
  }
}
function changed() {
  if (!editing.editable) throw Error(editing.reason);
  revision++;
  dirty = true;
  saveStatus(
    exampleWorkspace
      ? "Example mode — changes are temporary"
      : "Saving automatically…",
  );
  invalidate();
  message("");
  scheduleSave();
  calculationStatus("Updating assessment…");
}
function scheduleProjection() {
  clearRefresh();
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    try {
      commit({ normalize: false, report: false });
      if (hasAmounts())
        startAssessment("single", { committed: true, scroll: false });
      else showProjection();
    } catch (error) {
      calculationStatus(
        `${error.message}${lastResult ? " Previous results remain visible." : ""}`,
        true,
      );
    }
  }, 650);
}
function inputValue(node, fallback) {
  if (node.type === "checkbox") return node.checked;
  if (node.value.trim() === "") return fallback;
  if (node.type === "number")
    return node.valueAsNumber / (node.hasAttribute("data-percent") ? 100 : 1);
  return node.value;
}
function reportValidity(report = true) {
  const invalid = [...form.querySelectorAll("input,select")].find(
    (x) => !x.checkValidity(),
  );
  if (invalid) {
    if (!report) return false;
    let n = invalid.parentElement;
    while (n) {
      if (n.tagName === "DETAILS") n.open = true;
      n = n.parentElement;
    }
    invalid.reportValidity();
    return false;
  }
  return true;
}
function commit({ normalize = true, report = true } = {}) {
  if (normalize) clearRefresh();
  if (!reportValidity(report))
    throw Error("Complete the highlighted input before continuing.");
  const candidate = clone(plan),
    st = candidate.students.find((x) => x.id === studentId),
    sc = st.scenarios.find((x) => x.id === scenarioId);
  for (const n of form.querySelectorAll("[data-student]"))
    st[n.dataset.student] = inputValue(n, st[n.dataset.student]);
  for (const n of form.querySelectorAll("[data-scenario]"))
    sc[n.dataset.scenario] = inputValue(n, sc[n.dataset.scenario]);
  for (const n of form.querySelectorAll("[data-funding]"))
    st.funding[n.dataset.funding] = inputValue(
      n,
      st.funding[n.dataset.funding],
    );
  for (const n of form.querySelectorAll("[data-cost]"))
    sc.costs[n.dataset.cost] = inputValue(n, 0);
  for (const n of form.querySelectorAll("[data-billing]"))
    sc.billing[n.dataset.billing] =
      n.dataset.billing === "livingMonths" ? Number(n.value) : n.value;
  for (const n of form.querySelectorAll("[data-source]"))
    sc.costSource[n.dataset.source] = n.value.trim();
  st.funding.history.allocations = [
    ...$("#allocation-changes").querySelectorAll(".allocation-row"),
  ].map((row) => {
    const stocks = row.querySelector("[data-stocks]").valueAsNumber / 100,
      bonds = row.querySelector("[data-bonds]").valueAsNumber / 100;
    return {
      date: row.querySelector("[data-date]").value,
      stocks,
      bonds,
      cash: 1 - stocks - bonds,
      referenceRate: null,
    };
  });
  for (const n of form.querySelectorAll("[data-history]"))
    sc.history[n.dataset.history] =
      n.dataset.history === "blockYears"
        ? Number(n.value)
        : inputValue(n, sc.history[n.dataset.history]);
  for (const n of form.querySelectorAll("[data-assumption]"))
    sc.assumptions[n.dataset.assumption] = inputValue(
      n,
      sc.assumptions[n.dataset.assumption],
    );
  for (const n of form.querySelectorAll("[data-investment]"))
    st.funding.history[n.dataset.investment] = inputValue(
      n,
      st.funding.history[n.dataset.investment],
    );
  for (const n of form.querySelectorAll("[data-investment-assumption]"))
    st.funding.assumptions[n.dataset.investmentAssumption] = inputValue(
      n,
      st.funding.assumptions[n.dataset.investmentAssumption],
    );
  for (const key of ["balance", "monthly", "grant", "income", "stepUp"]) {
    const node = form.querySelector(`[data-funding=${key}]`);
    if (node.value.trim() === "") st.funding[key] = 0;
  }
  for (const key of ["sharedAllocation"]) {
    const node = form.querySelector(`[data-student=${key}]`);
    if (node.value.trim() === "") st[key] = 0;
  }
  st.funding.gifts = [...$("#gifts").querySelectorAll(".gift-row")].map(
    (row) => ({
      date: row.querySelector("[data-date]").value,
      amount: row.querySelector("[data-amount]").valueAsNumber,
    }),
  );
  candidate.valuation = inputValue($("#valuation"), plan.valuation);
  candidate.sharedPool = inputValue($("#shared-pool"), 0);
  if (st.enrollment !== student().enrollment) {
    const oldEnd = monthText(
      Math.max(month(plan.valuation), month(student().enrollment) - 1),
    );
    const newEnd = monthText(
      Math.max(month(candidate.valuation), month(st.enrollment) - 1),
    );
    if (st.funding.contributionEnd === oldEnd)
      st.funding.contributionEnd = newEnd;
    form.querySelector("[data-funding=contributionEnd]").value =
      st.funding.contributionEnd;
  }
  if (assumptionEdited) {
    st.funding.assumptionsStatus = "user-defined";
    st.funding.assumptionsDate = currentMonth();
  }
  validatePlan(candidate);
  plan = candidate;
  assumptionEdited = false;
  updateAllocation();
  if (normalize) {
    for (const n of form.querySelectorAll("[data-student]"))
      fill(n, st[n.dataset.student]);
    for (const n of form.querySelectorAll("[data-scenario]"))
      fill(n, sc[n.dataset.scenario]);
    for (const n of form.querySelectorAll("[data-funding]"))
      fill(n, st.funding[n.dataset.funding]);
    for (const n of form.querySelectorAll("[data-cost]"))
      fill(n, sc.costs[n.dataset.cost]);
    for (const n of form.querySelectorAll("[data-assumption]"))
      fill(n, sc.assumptions[n.dataset.assumption]);
    for (const n of form.querySelectorAll("[data-investment]"))
      fill(n, st.funding.history[n.dataset.investment]);
    for (const n of form.querySelectorAll("[data-investment-assumption]"))
      fill(n, st.funding.assumptions[n.dataset.investmentAssumption]);
    for (const n of form.querySelectorAll("[data-history]"))
      fill(n, sc.history[n.dataset.history]);
    $("#valuation").value = plan.valuation;
    $("#shared-pool").value = plan.sharedPool;
  }
  $("#family-calendar").replaceChildren(familyCalendarView(plan));
  updateDefaultsSummary(st, sc);
  const studentOption = [...$("#student-select").options].find(
    (x) => x.value === studentId,
  );
  if (studentOption) studentOption.textContent = st.alias;
  const scenarioOption = [...$("#scenario-select").options].find(
    (x) => x.value === scenarioId,
  );
  if (scenarioOption) scenarioOption.textContent = sc.name;
  return plan;
}
function option(select, value, label) {
  const op = el("option", label);
  op.value = value;
  select.append(op);
}
function fill(node, value) {
  if (node.type === "checkbox") node.checked = value;
  else {
    if (
      node.tagName === "SELECT" &&
      ![...node.options].some((o) => o.value === String(value))
    )
      option(node, value, value);
    node.value = node.hasAttribute("data-percent")
      ? Number((value * 100).toFixed(8))
      : value;
  }
}
function giftRow(g = { date: plan.valuation, amount: 0 }) {
  const row = el("div", "", "gift-row"),
    date = el("label", "Gift month"),
    amount = el("label", "Amount ($)"),
    di = el("input"),
    ai = el("input"),
    remove = el("button", "Remove");
  di.type = "month";
  di.required = true;
  di.dataset.date = "";
  di.value = g.date;
  ai.type = "number";
  ai.min = "0";
  ai.max = "100000000";
  ai.step = ".01";
  ai.required = true;
  ai.dataset.amount = "";
  ai.value = g.amount;
  date.append(di);
  amount.append(ai);
  remove.type = "button";
  remove.addEventListener("click", () => {
    row.remove();
    changed();
    scheduleProjection();
  });
  row.append(date, amount, remove);
  return row;
}
function allocationRow(
  entry = { date: plan.valuation, stocks: 0.3, bonds: 0.4, cash: 0.3 },
) {
  const row = el("div", "", "allocation-row");
  for (const [label, key, type, value] of [
    ["From month", "date", "month", entry.date],
    ["Stocks (%)", "stocks", "number", entry.stocks * 100],
    ["Bonds (%)", "bonds", "number", entry.bonds * 100],
  ]) {
    const l = el("label", label),
      input = el("input");
    input.type = type;
    input.dataset[key] = "";
    input.required = true;
    input.value = type === "number" ? Number(value.toFixed(6)) : value;
    if (type === "number") {
      input.min = "0";
      input.max = "100";
      input.step = ".1";
    }
    l.append(input);
    row.append(l);
  }
  const cash = el("p", `Cash: ${(entry.cash * 100).toFixed(1)}%`, "hint");
  row.append(cash);
  row.addEventListener("input", () => {
    const stocks = row.querySelector("[data-stocks]").valueAsNumber,
      bonds = row.querySelector("[data-bonds]").valueAsNumber;
    cash.textContent = `Cash: ${(100 - stocks - bonds).toFixed(1)}%`;
  });
  const remove = el("button", "Remove");
  remove.type = "button";
  remove.onclick = () => {
    row.remove();
    changed();
    scheduleProjection();
  };
  row.append(remove);
  return row;
}
function previewPreset() {
  const p = COST_PRESETS[$("#cost-preset").value];
  $("#apply-preset").disabled = !p;
  if (!p) {
    $("#preset-preview").replaceChildren();
    return;
  }
  const link = el("a", p.source);
  link.href = p.url;
  $("#preset-preview").replaceChildren(
    el(
      "p",
      `${p.academicYear} · on campus · annual school budget · modeled over ${p.livingMonths} months · before grants`,
    ),
    table(
      "Published annual budget",
      ["Category", "Amount"],
      Object.entries(p.costs)
        .map(([k, v]) => [
          {
            tuition: "Tuition & fees",
            housing: "Housing & food",
            books: "Books & supplies",
            transport: "Transportation",
            other: "Other expenses",
          }[k],
          money(v),
        ])
        .concat([["Total (includes tuition)", money(p.total)]]),
    ),
    link,
    el("p", `${p.note} Source checked ${p.asOf}.`, "hint"),
  );
}
for (const [key, p] of Object.entries(COST_PRESETS))
  option($("#cost-preset"), key, p.name);
$("#cost-preset").addEventListener("change", previewPreset);
$("#apply-preset").onclick = () =>
  guard(() => {
    commit();
    const st = student(),
      index = st.scenarios.findIndex((s) => s.id === scenarioId);
    st.scenarios[index] = applyCostPreset(
      scenario(),
      $("#cost-preset").value,
      plan.valuation,
    );
    validatePlan(plan);
    changed();
    renderForm();
    message(
      "Published budget applied. Adjust the categories for your school; no aid amount was inferred.",
    );
  });
$("#add-allocation").onclick = () => {
  if ($("#allocation-changes").children.length >= 24)
    return message("Up to 24 allocation changes.");
  $("#allocation-changes").append(allocationRow());
  changed();
  scheduleProjection();
};
function hasAmounts() {
  return plan.students.some(
    (st) =>
      st.funding.balance + st.sharedAllocation > 0 ||
      st.scenarios.some((sc) => Object.values(sc.costs).some((x) => x > 0)),
  );
}
function updateDefaultsSummary(st, sc) {
  const calibrated = $("#economic-method").value === "calibrated";
  for (const name of ["period", "tuitionBasis"])
    form.querySelector(`[data-history=${name}]`).disabled = calibrated;
  for (const name of ["tuitionGrowth", "livingGrowth", "inflation"])
    form.querySelector(`[data-assumption=${name}]`).disabled =
      calibrated && sc.history.costMode === "historical";
  $("#economic-method-note").textContent = calibrated
    ? "State-dependent investments, comparable-college cost growth and forward anchors replace the historical period, tuition basis and cost-growth fields when variable costs are selected. Annual blocks share market and cost shocks. Validation results are included below."
    : "Historical replay mode uses the selected period and tuition basis. The economic calibration cases are not applied.";

  const profile = PROFILES[st.funding.history.profile];
  $("#defaults-summary").textContent =
    `${sc.years} attendance years · ${sc.billing.calendar === "quarter" ? "3 quarter" : "2 semester"} tuition bills · ${sc.billing.livingMonths} living months · ${profile.name} · ${$("#economic-method").value === "calibrated" ? "three economic cases" : "historical outcomes from " + periodLabel(sc.history.period)}. One calculation includes investment and expense ranges.`;
  $("#cost-source-status").textContent = sc.costSource.presetId
    ? `${sc.costSource.modified ? "Edited budget based on" : "Published budget from"} ${sc.source}. Baseline ${sc.baseline}; checked ${sc.sourceDate}.`
    : "Your own estimate; source details are optional.";
  const labels = ["Early saving", "Final saving years", "During university"];
  $("#portfolio-summary").replaceChildren(
    ...profile.stages.map((weights, i) =>
      el(
        "p",
        `${labels[i]}: ${weights.map((w, j) => `${Math.round(w * 100)}% ${["stocks", "bonds", "cash"][j]}`).join(" / ")}.`,
      ),
    ),
  );
}
function updateAllocation() {
  const allocated = plan.students.reduce((v, s) => v + s.sharedAllocation, 0);
  $("#allocation-note").textContent =
    `Pool assigned across students: ${money(allocated)} of ${money(plan.sharedPool)}. This student's share is reused across their alternative scenarios and counted once across students.`;
}
function renderForm() {
  for (const [sid, cid] of Object.entries(plan.family.scenarios))
    if (
      !plan.students.some(
        (st) => st.id === sid && st.scenarios.some((sc) => sc.id === cid),
      )
    )
      delete plan.family.scenarios[sid];
  const st = student(),
    sc = scenario();
  $("#student-select").replaceChildren();
  plan.students.forEach((s) => option($("#student-select"), s.id, s.alias));
  $("#student-select").value = studentId;
  $("#scenario-select").replaceChildren();
  st.scenarios.forEach((s) => option($("#scenario-select"), s.id, s.name));
  $("#scenario-select").value = scenarioId;
  form
    .querySelectorAll("[data-student]")
    .forEach((n) => fill(n, st[n.dataset.student]));
  form
    .querySelectorAll("[data-scenario]")
    .forEach((n) => fill(n, sc[n.dataset.scenario]));
  form
    .querySelectorAll("[data-funding]")
    .forEach((n) => fill(n, st.funding[n.dataset.funding]));
  form
    .querySelectorAll("[data-cost]")
    .forEach((n) => fill(n, sc.costs[n.dataset.cost]));
  form
    .querySelectorAll("[data-assumption]")
    .forEach((n) => fill(n, sc.assumptions[n.dataset.assumption]));
  form
    .querySelectorAll("[data-investment]")
    .forEach((n) => fill(n, st.funding.history[n.dataset.investment]));
  form
    .querySelectorAll("[data-investment-assumption]")
    .forEach((n) =>
      fill(n, st.funding.assumptions[n.dataset.investmentAssumption]),
    );
  form
    .querySelectorAll("[data-history]")
    .forEach((n) => fill(n, sc.history[n.dataset.history]));
  form
    .querySelectorAll("[data-billing]")
    .forEach((n) => fill(n, sc.billing[n.dataset.billing]));
  form
    .querySelectorAll("[data-source]")
    .forEach((n) => fill(n, sc.costSource[n.dataset.source]));
  $("#allocation-changes").replaceChildren(
    ...st.funding.history.allocations.map(allocationRow),
  );
  $("#family-calendar").replaceChildren(familyCalendarView(plan));
  renderFamilyControls();
  $("#valuation").value = plan.valuation;
  $("#shared-pool").value = plan.sharedPool;
  $("#gifts").replaceChildren(...st.funding.gifts.map(giftRow));
  $("#assumption-status").textContent =
    `Assumptions updated ${st.funding.assumptionsDate}.`;
  updateDefaultsSummary(st, sc);
  const share = form.querySelector("[data-funding=share]");
  share.disabled = st.funding.coverage !== "percent";
  $("#delete-student").disabled = plan.students.length === 1;
  $("#delete-scenario").disabled = st.scenarios.length === 1;
  updateAllocation();
  assumptionEdited = false;
  try {
    if (hasAmounts())
      startAssessment("single", { committed: true, scroll: false });
    else showProjection();
  } catch (error) {
    calculationStatus(error.message, true);
  }
}
async function guard(action) {
  try {
    if (!editing.editable) throw Error(editing.reason);
    await action();
  } catch (e) {
    message(e.message || String(e), true);
    calculationStatus(e.message || String(e), true);
  }
}
function confirmAction(title, body) {
  return new Promise((resolve) => {
    const d = $("#confirm-dialog");
    $("#dialog-title").textContent = title;
    $("#dialog-body").textContent = body;
    const finish = (v) => {
      d.close();
      $("#dialog-yes").onclick = null;
      $("#dialog-no").onclick = null;
      d.oncancel = null;
      resolve(v);
    };
    $("#dialog-yes").onclick = () => finish(true);
    $("#dialog-no").onclick = () => finish(false);
    d.oncancel = (e) => {
      e.preventDefault();
      finish(false);
    };
    d.showModal();
    $("#dialog-no").focus();
  });
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function resultActions() {
  const actions = el("div", "", "actions"),
    report = el("button", "Export assessment JSON"),
    csv = el("button", "Export outcome ranges CSV"),
    print = el("button", "Print report");
  report.onclick = () =>
    download(
      "education-finance-assessment.json",
      JSON.stringify(lastResult, null, 2),
      "application/json",
    );
  csv.onclick = () => {
    const assessedStudent = lastResult.plan.students.find(
        (s) => s.id === lastResult.studentId,
      ),
      assessedScenario = assessedStudent.scenarios.find(
        (s) => s.id === lastResult.scenarioId,
      );
    const all = lastResult.comparisons || [
      { name: assessedScenario.name, simulation: lastResult.simulation },
    ];
    const rows = [
      [
        "Student",
        "Scenario",
        "Dataset",
        "Historical period",
        "Trials",
        "Metric",
        "10th percentile",
        "Median",
        "90th percentile",
      ],
    ];
    for (const r of all)
      if (r.simulation)
        for (const [key, label] of [
          ["enrollment", "Savings at enrollment"],
          ["costRange", "Total college cost"],
          ["tuitionRange", "Tuition cost"],
          ["gap", "Unpaid covered expenses"],
          ["ending", "Funds remaining"],
        ]) {
          const range = r.simulation[key];
          rows.push([
            assessedStudent.alias,
            r.name,
            r.simulation.assumptionsVersion,
            r.simulation.period,
            r.simulation.trials,
            label,
            ...["p10", "p50", "p90"].map((k) =>
              range[k] === null ? "" : range[k].toFixed(2),
            ),
          ]);
        }
    download("education-finance-ranges.csv", csvText(rows), "text/csv");
  };
  print.onclick = () => window.print();
  actions.append(report, csv, print);
  return actions;
}
function referencePanel(result) {
  const details = el("details", "", "reference-panel");
  details.append(el("summary", "Reference projection & assumptions"));
  details.append(
    annualFundingView(
      plan,
      student(),
      result.referenceScenario || scenario(),
      result.deterministic,
    ),
    deterministicView(
      plan,
      student(),
      result.referenceScenario || scenario(),
      result.deterministic,
    ),
  );
  return details;
}
function assessmentContents(result) {
  const validation = result.robustness?.validation,
    testingNote =
      validation?.folds.length && validation.coverage < 0.5
        ? [
            el(
              "p",
              `Historical proxy replay coverage was weak: ${validation.folds.filter((f) => f.costInRange).length} of ${validation.folds.length} proxy-based costs fell inside P10–P90. This diagnostic does not validate actual school prices; compare the history periods and stress cases.`,
              "callout warning",
            ),
          ]
        : [];
  return [
    ...testingNote,
    ...(result.household?.monthlyLimit !== null && result.household
      ? [
          el(
            "p",
            "Student results use this student’s entered contributions. The household section below applies the combined savings-deposit limit.",
            "callout",
          ),
        ]
      : []),
    simulationView(
      result.simulation,
      result.sensitivity,
      result.calibration?.cases,
    ),
    ...(result.household ? [householdView(result.household)] : []),
    result.calibration
      ? calibrationContextView(result)
      : historyContextView(result),
    referencePanel(result),
  ];
}

function showProjection() {
  const c = compile(plan, student(), scenario()),
    det = runPath(c);
  lastResult = {
    modelVersion: MODEL,
    prngVersion: PRNG,
    assumptionsVersion: ASSUMPTIONS,
    generatedAt: new Date().toISOString(),
    plan: clone(plan),
    studentId,
    scenarioId,
    deterministic: det,
  };
  const target = $("#results-content");
  delete target.dataset.stale;
  target.replaceChildren(referencePanel({ deterministic: det }));
  target.hidden = false;
  $("#empty-results").hidden = true;
  calculationStatus(
    "Enter your figures, then Calculate for the full range of outcomes.",
  );
}
function settings() {
  if ($("#seed").value === "") $("#seed").value = String(currentSeed);
  if ($("#ceiling").value === "") $("#ceiling").value = "10000";
  for (const selector of ["#seed", "#ceiling"])
    if (!$(selector).reportValidity())
      throw Error("Review simulation settings.");
  currentSeed = updateSessionSeed($("#seed").valueAsNumber);
  return {
    method: $("#economic-method").value,
    seed: currentSeed,
    trials: Number($("#trials").value),
    threshold: Number($("#threshold").value),
    ceiling: $("#ceiling").valueAsNumber,
  };
}
function startAssessment(
  action = "single",
  { committed = false, scroll = true } = {},
) {
  if (!committed) commit();
  else clearRefresh();
  const config = settings();
  cancel();
  if (
    !lastResult ||
    lastResult.studentId !== studentId ||
    lastResult.scenarioId !== scenarioId
  )
    showProjection();
  message("");
  calculationStatus("Calculating outcome ranges…");
  const thisRun = ++runId,
    snapshot = clone(plan);
  $("#run-status").hidden = false;
  $("#progress-text").textContent = "Loading economic data…";
  $("#progress").value = 0;
  if (scroll)
    $("#run-status").scrollIntoView({ block: "start", behavior: "smooth" });
  worker = new Worker(new URL("./worker.js?v=0.9.0", import.meta.url), {
    type: "module",
  });
  worker.onmessage = ({ data }) => {
    if (data.runId !== runId) return;
    if (data.type === "progress") {
      $("#progress").value = data.done / Math.max(1, data.total);
      $("#progress-text").textContent =
        `${data.scenario ? data.scenario + " · " : ""}${data.stage} · ${Math.round((data.done / Math.max(1, data.total)) * 100)}%`;
    } else if (data.type === "error") {
      cancel();
      calculationStatus(data.message, true);
    } else if (data.type === "result") {
      cancel();
      const target = $("#results-content");
      delete target.dataset.stale;
      const selected =
        action === "compare"
          ? data.result.find((r) => r.id === scenarioId)
          : data.result;
      lastResult = {
        modelVersion: MODEL,
        prngVersion: selected.simulation.prngVersion,
        assumptionsVersion: selected.dataset.id,
        generatedAt: new Date().toISOString(),
        plan: snapshot,
        studentId,
        scenarioId,
        settings: config,
        ...selected,
      };
      if (action === "compare") {
        lastResult.comparisons = data.result;
        target.replaceChildren(
          comparisonView(data.result),
          ...assessmentContents(selected),
        );
      } else target.replaceChildren(...assessmentContents(selected));
      target.append(resultActions());
      target.hidden = false;
      $("#empty-results").hidden = true;
      calculationStatus(
        "Assessment complete. Investment, expense, and funding-gap ranges are ready.",
      );
      message("");
    }
  };
  worker.onerror = (e) => {
    cancel();
    calculationStatus(
      `Assessment could not complete: ${e.message}. Previous results remain available.`,
      true,
    );
  };
  worker.postMessage({
    runId: thisRun,
    plan: snapshot,
    studentId,
    scenarioId,
    settings: config,
    action,
  });
}

form.addEventListener("input", (e) => {
  if (e.target.id === "cost-preset") return;
  if (
    e.target.id === "economic-method" ||
    e.target.dataset.history === "costMode"
  )
    updateDefaultsSummary(student(), scenario());
  if (
    (e.target.dataset.cost !== undefined ||
      e.target.dataset.source !== undefined ||
      e.target.dataset.billing === "livingMonths") &&
    scenario().costSource.presetId
  )
    scenario().costSource.modified = true;
  changed();
  if (
    e.target.dataset.investmentAssumption !== undefined ||
    e.target.dataset.funding === "stress"
  ) {
    assumptionEdited = true;
  }
  scheduleProjection();
});
form.addEventListener("change", (e) => {
  if (e.target.id === "cost-preset") return;
  if (
    e.target.id === "economic-method" ||
    e.target.dataset.history === "costMode"
  )
    updateDefaultsSummary(student(), scenario());
  if (
    e.target.tagName === "SELECT" ||
    e.target.type === "month" ||
    e.target.type === "checkbox"
  ) {
    changed();
    scheduleProjection();
  }
  if (e.target.dataset.funding === "coverage")
    form.querySelector("[data-funding=share]").disabled =
      e.target.value !== "percent";
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  guard(() => startAssessment());
});
$("#compare").onclick = () => guard(() => startAssessment("compare"));
$("#cancel").onclick = () => {
  cancel(true);
  calculationStatus("Calculation cancelled. Previous results remain visible.");
};
$("#add-gift").onclick = () => {
  if ($("#gifts").children.length >= 24)
    return message("A student allows up to 24 gifts.", true);
  $("#gifts").append(giftRow());
  changed();
  scheduleProjection();
};
$("#student-select").onchange = () =>
  guard(() => {
    const selected = $("#student-select").value;
    try {
      commit();
      studentId = selected;
      scenarioId = student().scenarios[0].id;
      invalidate();
      renderForm();
      if (!exampleWorkspace) persistSnapshot().catch(() => {});
      message("Student selected.");
    } catch (e) {
      $("#student-select").value = studentId;
      throw e;
    }
  });
$("#scenario-select").onchange = () =>
  guard(() => {
    const selected = $("#scenario-select").value;
    try {
      commit();
      scenarioId = selected;
      invalidate();
      renderForm();
      if (!exampleWorkspace) persistSnapshot().catch(() => {});
      message("Scenario selected.");
    } catch (e) {
      $("#scenario-select").value = scenarioId;
      throw e;
    }
  });
$("#add-student").onclick = () =>
  guard(() => {
    commit();
    if (plan.students.length >= 30) throw Error("Maximum 30 students.");
    const st = newStudent(plan.valuation);
    st.alias = `Student ${plan.students.length + 1}`;
    st.scenarios[0].assumptions = pick(plan.defaults, expenseKeys);
    st.funding.assumptions = pick(plan.defaults, investmentKeys);
    st.funding.assumptionsStatus = "user-defined";
    const candidate = clone(plan);
    candidate.students.push(st);
    validatePlan(candidate);
    plan = candidate;
    studentId = st.id;
    scenarioId = st.scenarios[0].id;
    changed();
    renderForm();
  });
$("#copy-student").onclick = () =>
  guard(() => {
    commit();
    if (plan.students.length >= 30) throw Error("Maximum 30 students.");
    const st = duplicateStudent(student());
    const candidate = clone(plan);
    candidate.students.push(st);
    validatePlan(candidate);
    plan = candidate;
    studentId = st.id;
    scenarioId = st.scenarios[0].id;
    changed();
    renderForm();
    message(
      "Student duplicated with funding amounts and shared allocation reset to zero.",
    );
  });
$("#delete-student").onclick = () =>
  guard(async () => {
    if (plan.students.length < 2) return;
    if (
      !(await confirmAction(
        "Delete this student?",
        `Remove ${student().alias} and all their scenarios from this workspace? The change is saved automatically in this browser.`,
      ))
    )
      return;
    plan.students = plan.students.filter((s) => s.id !== studentId);
    studentId = plan.students[0].id;
    scenarioId = student().scenarios[0].id;
    changed();
    renderForm();
  });
function addScenario(copy = false) {
  commit();
  const st = student();
  if (st.scenarios.length >= 20)
    throw Error("Maximum 20 scenarios per student.");
  const s = copy
    ? clone(scenario())
    : defaultScenario(plan.valuation, st.enrollment);
  s.id = id();
  s.name = copy
    ? `${s.name.slice(0, 85)} copy`
    : `Path ${st.scenarios.length + 1}`;
  if (!copy) s.assumptions = pick(plan.defaults, expenseKeys);
  const candidate = clone(plan);
  candidate.students.find((x) => x.id === studentId).scenarios.push(s);
  validatePlan(candidate);
  plan = candidate;
  scenarioId = s.id;
  changed();
  renderForm();
}
$("#add-scenario").onclick = () => guard(() => addScenario());
$("#copy-scenario").onclick = () => guard(() => addScenario(true));
$("#delete-scenario").onclick = () =>
  guard(async () => {
    if (student().scenarios.length < 2) return;
    if (
      !(await confirmAction(
        "Delete this scenario?",
        `Remove ${scenario().name} from this workspace?`,
      ))
    )
      return;
    student().scenarios = student().scenarios.filter(
      (s) => s.id !== scenarioId,
    );
    scenarioId = student().scenarios[0].id;
    changed();
    renderForm();
  });
$("#set-defaults").onclick = () =>
  guard(() => {
    commit();
    plan.defaults = {
      ...clone(funding().assumptions),
      ...clone(scenario().assumptions),
    };
    changed();
    renderForm();
    message(
      "Reference defaults updated. Existing scenarios retain their values. Defaults save automatically.",
    );
  });
$("#apply-defaults").onclick = () =>
  guard(() => {
    commit();
    scenario().assumptions = pick(plan.defaults, expenseKeys);
    funding().assumptions = pick(plan.defaults, investmentKeys);
    funding().assumptionsStatus = "user-defined";
    funding().assumptionsDate = currentMonth();
    changed();
    renderForm();
    message(
      "Expense defaults applied to this scenario; investment defaults applied to this student across scenarios.",
    );
  });
$("#save").onclick = () =>
  guard(async () => {
    if (exampleWorkspace) throw Error("Exit the example to save your plan.");
    commit();
    await persistSnapshot();
    message("Plan saved in this browser. Export a backup for portability.");
  });
$("#export").onclick = () =>
  guard(() => {
    commit();
    download(
      "education-finance-plan.json",
      exportPlan(plan),
      "application/json",
    );
    message(
      "Plan exported. The JSON contains financial inputs; store it privately.",
    );
  });
$("#import").onclick = () => $("#import-file").click();
$("#import-file").onchange = () =>
  guard(async () => {
    const file = $("#import-file").files[0];
    $("#import-file").value = "";
    if (!file) return;
    if (file.size > 2_000_000) throw Error("Import file must be under 2 MB.");
    pendingImport = parseImport(await file.text());
    $("#import-preview").textContent =
      `${pendingImport.students.length} students · ${pendingImport.students.reduce((n, s) => n + s.scenarios.length, 0)} scenarios · valuation ${pendingImport.valuation}. Students: ${pendingImport.students.map((s) => s.alias).join(", ")}.`;
    $("#import-dialog").showModal();
    $("#import-cancel").focus();
  });
$("#import-cancel").onclick = () => {
  pendingImport = null;
  $("#import-dialog").close();
};
$("#import-dialog").oncancel = () => {
  pendingImport = null;
};
$("#import-confirm").onclick = () =>
  guard(() => {
    if (!pendingImport) return;
    plan = pendingImport;
    pendingImport = null;
    studentId = plan.students[0].id;
    scenarioId = student().scenarios[0].id;
    $("#import-dialog").close();
    changed();
    renderForm();
    message("Imported into this workspace and saving automatically.");
  });
$("#delete-local").onclick = () =>
  guard(async () => {
    if (
      !(await confirmAction(
        "Delete all local data?",
        "This deletes the stored plan and resets the current workspace. Export first if you need a backup. Other open tabs may still hold their own in-memory copy.",
      ))
    )
      return;
    saveEpoch++;
    await saveQueue.catch(() => {});
    await clearPlan();
    clearRecovery();
    clearDraft();
    plan = newPlan();
    studentId = plan.students[0].id;
    scenarioId = student().scenarios[0].id;
    dirty = false;
    invalidate();
    renderForm();
    $("#save-state").textContent = "Not saved locally";
    message("Stored plan deleted; workspace reset.");
  });
function showExampleMode(active) {
  $("#example-notice").hidden = !active;
  for (const selector of ["#save", "#import", "#delete-local", "#example"])
    $(selector).disabled = active;
}
$("#example").onclick = () =>
  guard(() => {
    if (exampleWorkspace) return;
    commit();
    if (dirty) persistSnapshot().catch(() => {}); // Capture all valid pending edits before switching to fictional data.
    exampleWorkspace = {
      plan: clone(plan),
      studentId,
      scenarioId,
      dirty,
      saveState: $("#save-state").textContent,
      revision,
    };
    plan = newPlan();
    const st = plan.students[0],
      s = st.scenarios[0];
    st.alias = "Fictional student";
    s.name = "Illustrative in-state";
    s.path = "Public in-state";
    s.costs = {
      tuition: 14000,
      housing: 16000,
      books: 1200,
      transport: 2000,
      other: 1500,
    };
    st.funding.balance = 60000;
    st.funding.monthly = 500;
    s.source = "Fictional example, not a school quote or national benchmark";
    studentId = st.id;
    scenarioId = s.id;
    changed();
    renderForm();
    showExampleMode(true);
    $("#exit-example").focus();
    message("");
  });
$("#exit-example").onclick = () =>
  guard(() => {
    if (!exampleWorkspace) return;
    clearRefresh();
    cancel();
    const kept = exampleWorkspace;
    exampleWorkspace = null;
    plan = kept.plan;
    studentId = kept.studentId;
    scenarioId = kept.scenarioId;
    dirty = kept.dirty;
    revision++;
    lastResult = null;
    showExampleMode(false);
    renderForm();
    $("#save-state").textContent = kept.saveState;
    if (dirty) scheduleSave();
    message("Your plan is restored.");
    form.querySelector("[data-funding=balance]").focus();
  });
window.addEventListener("beforeunload", (e) => {
  checkpoint()?.catch(() => {});
  if (exampleWorkspace ? exampleWorkspace.dirty : dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("pagehide", () => checkpoint()?.catch(() => {}));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") checkpoint()?.catch(() => {});
});
let resetPrevious = false;
if (editing.editable) {
  try {
    resetPrevious = await resetIncompatibleStorage();
  } catch (error) {
    message(`Could not reset incompatible local data: ${error.message}`, true);
  }
}
let recovered = false,
  unfinished = null;
try {
  unfinished = loadDraft();
} catch {
  message(
    "Could not restore the unfinished draft. The last valid plan is still available.",
    true,
  );
}
try {
  const saved = loadRecovery();
  if (saved) {
    plan = saved.plan;
    studentId = saved.selection.studentId;
    scenarioId = saved.selection.scenarioId;
    dirty = saved.pending;
    recovered = true;
    saveStatus(
      saved.pending ? "Recovering recent edits…" : "Loaded from this browser",
    );
  }
} catch {
  message(
    "Could not read the recovery copy. Trying the last saved plan.",
    true,
  );
}
if (unfinished) {
  plan = unfinished.plan;
  studentId = unfinished.selection.studentId;
  scenarioId = unfinished.selection.scenarioId;
  dirty = true;
  recovered = true;
}
renderForm();
if (unfinished) {
  try {
    cancel();
    restoreFields(unfinished);
    invalidate();
    saveStatus("Unfinished draft restored — complete fields to calculate");
    calculationStatus(
      "Your unfinished entries were restored. Complete them, then Calculate.",
    );
  } catch (error) {
    dirty = false;
    renderForm();
    message(
      `The draft layout could not be restored: ${error.message} The last valid plan is available.`,
      true,
    );
  }
} else if (recovered && dirty) scheduleSave();
const loadRevision = revision;
try {
  const stored = await loadPlan();
  if (
    stored &&
    !recovered &&
    !dirty &&
    !exampleWorkspace &&
    revision === loadRevision
  ) {
    plan = stored;
    studentId = plan.students[0].id;
    scenarioId = student().scenarios[0].id;
    saveStatus("Loaded from this browser");
    message("");
    renderForm();
  }
} catch (e) {
  if (!recovered)
    message(
      `Could not load local data: ${e.message}. Import a backup or continue; exporting remains available.`,
      true,
    );
}

if (resetPrevious) {
  message(
    "Previous saved plans were reset for this update. Savings and funding now belong to each student.",
  );
  saveStatus("New student funding workspace");
}

function renderFamilyControls() {
  const target = $("#family-settings");
  target.replaceChildren();
  const limitLabel = el(
      "label",
      "Household monthly savings-deposit limit ($, optional)",
    ),
    limit = el("input");
  limit.type = "number";
  limit.min = "0";
  limit.max = "1000000";
  limit.step = "0.01";
  limit.value = plan.family.monthlyLimit ?? "";
  limit.placeholder = "No limit";
  limit.id = "household-limit";
  limitLabel.append(limit);
  target.append(limitLabel);
  limit.oninput = () =>
    guard(() => {
      if (!limit.checkValidity()) return;
      commit();
      plan.family.monthlyLimit =
        limit.value === "" ? null : limit.valueAsNumber;
      changed();
      scheduleProjection();
    });
  for (const st of plan.students) {
    const label = el("label", `${st.alias} · household scenario`),
      select = el("select");
    select.dataset.familyStudent = st.id;
    st.scenarios.forEach((sc) => option(select, sc.id, sc.name));
    select.value = plan.family.scenarios[st.id] || st.scenarios[0].id;
    select.onchange = () =>
      guard(() => {
        commit();
        plan.family.scenarios[st.id] = select.value;
        changed();
        scheduleProjection();
      });
    label.append(select);
    target.append(label);
  }
}
if (!editing.editable) {
  document
    .querySelectorAll("input,select,button")
    .forEach((n) => (n.disabled = true));
  saveStatus("Read-only · another tab or unsupported editing", true);
  message(editing.reason, true);
}
