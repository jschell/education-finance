import {
  HISTORY_DEFAULTS,
  HISTORY_PRNG,
  PROFILES,
} from "./history-config.js?v=0.10.2";
export const MODEL = "college-funding-9.0.0",
  SCHEMA = 5,
  PRNG = HISTORY_PRNG,
  ASSUMPTIONS = "user-defined-1";
export const categories = ["tuition", "housing", "books", "transport", "other"];
export const expenseKeys = ["tuitionGrowth", "livingGrowth", "inflation"];
export const investmentKeys = [
  "returnRate",
  "mean",
  "volatility",
  "lateReturn",
  "lateMean",
  "lateVolatility",
  "attendanceReturn",
  "attendanceMean",
  "attendanceVolatility",
  "transitionYears",
];
export const assumptionKeys = [...investmentKeys, ...expenseKeys];
export const investmentHistoryKeys = [
  "profile",
  "reference",
  "fee",
  "allocations",
];
export const educationHistoryKeys = [
  "period",
  "blockYears",
  "costMode",
  "tuitionBasis",
];
export const pick = (value, keys) =>
  Object.fromEntries(keys.map((k) => [k, clone(value[k])]));
export const id = () => crypto.randomUUID(),
  clone = (x) => structuredClone(x);
export const DEFAULT_ASSUMPTIONS = {
  returnRate: 0.05,
  mean: 0.05,
  volatility: 0.1,
  tuitionGrowth: 0.04,
  livingGrowth: 0.03,
  inflation: 0.025,
  lateReturn: 0.03,
  lateMean: 0.03,
  lateVolatility: 0.05,
  attendanceReturn: 0.02,
  attendanceMean: 0.02,
  attendanceVolatility: 0.02,
  transitionYears: 3,
};
export function month(value) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    throw Error("Use a valid month in YYYY-MM format.");
  const [y, m] = value.split("-").map(Number);
  if (y < 2000 || y > 2100) throw Error("Dates must be between 2000 and 2100.");
  return y * 12 + m - 1;
}
export function monthText(value) {
  return `${Math.floor(value / 12)}-${String((value % 12) + 1).padStart(2, "0")}`;
}
export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function defaultFunding(valuation, enrollment) {
  return {
    balance: 0,
    monthly: 0,
    contributionStart: valuation,
    contributionEnd: monthText(
      Math.max(month(valuation), month(enrollment) - 1),
    ),
    stepUp: 0,
    gifts: [],
    grant: 0,
    grantYears: 4,
    income: 0,
    coverage: "full",
    share: 1,
    assumptions: pick(DEFAULT_ASSUMPTIONS, investmentKeys),
    history: {
      ...pick(HISTORY_DEFAULTS, ["profile", "reference", "fee"]),
      allocations: [],
    },
    assumptionsDate: valuation,
    assumptionsStatus: "illustrative",
    stress: false,
  };
}
export function defaultScenario(valuation = currentMonth()) {
  return {
    id: id(),
    name: "Path 1",
    path: "Custom path",
    living: "On campus",
    years: 4,
    baseline: valuation,
    costs: Object.fromEntries(categories.map((k) => [k, 0])),
    source: "User estimate",
    sourceDate: valuation,
    billing: { calendar: "semester", livingMonths: 9 },
    costSource: {
      school: "",
      academicYear: "",
      residency: "unspecified",
      url: "",
      presetId: "",
      modified: false,
    },
    history: pick(HISTORY_DEFAULTS, educationHistoryKeys),
    assumptions: pick(DEFAULT_ASSUMPTIONS, expenseKeys),
    schoolGrant: 0,
    schoolGrantYears: 4,
  };
}
export function newStudent(valuation) {
  const enrollment = `${Number(valuation.slice(0, 4)) + 8}-08`;
  return {
    id: id(),
    alias: "Student",
    enrollment,
    sharedAllocation: 0,
    funding: defaultFunding(valuation, enrollment),
    scenarios: [defaultScenario(valuation)],
  };
}
export function newPlan() {
  const valuation = currentMonth();
  return {
    schemaVersion: SCHEMA,
    modelVersion: MODEL,
    currency: "USD",
    valuation,
    sharedPool: 0,
    family: { monthlyLimit: null, scenarios: {} },
    defaults: clone(DEFAULT_ASSUMPTIONS),
    students: [newStudent(valuation)],
  };
}
// Only an in-memory calculation view is flattened. Saved education scenarios never
// contain savings, contributions or investment assumptions.
export function resolveScenario(student, education) {
  if (education?.resolved === true) return clone(education);
  if (!student?.funding) throw Error("Student funding is required.");
  const funding = student.funding;
  return {
    ...clone(education),
    ...clone(funding),
    assumptions: {
      ...clone(funding.assumptions),
      ...clone(education.assumptions),
    },
    history: { ...clone(funding.history), ...clone(education.history) },
    resolved: true,
  };
}
function object(x, keys, label) {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw Error(`${label} must be an object.`);
  const extra = Object.keys(x).filter((k) => !keys.includes(k));
  if (extra.length)
    throw Error(`${label} contains unsupported fields: ${extra.join(", ")}.`);
  for (const key of keys)
    if (!(key in x)) throw Error(`${label}: missing ${key}.`);
}
function text(x, max, label) {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw Error(`${label} must contain 1–${max} characters.`);
}
function number(x, min, max, label, integer = false) {
  if (
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    x < min ||
    x > max ||
    (integer && !Number.isInteger(x))
  )
    throw Error(
      `${label} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`,
    );
}
function array(x, max, label) {
  if (!Array.isArray(x) || x.length > max)
    throw Error(`${label} allows at most ${max} items.`);
}
export function validateAssumptions(a, keys = assumptionKeys) {
  object(a, keys, "Assumptions");
  for (const k of keys) {
    if (k === "transitionYears") number(a[k], 0, 10, k, true);
    else if (k.toLowerCase().includes("volatility")) number(a[k], 0, 0.6, k);
    else if (expenseKeys.includes(k)) number(a[k], -0.05, 0.15, k);
    else number(a[k], -0.5, 0.25, k);
  }
}
export function incompatiblePlan() {
  const error = Error(
    "Older saved plans and backups are incompatible with student-level funding. Start a new plan.",
  );
  error.code = "INCOMPATIBLE_PLAN";
  return error;
}
export function validatePlan(plan) {
  // Same student-funding schema; only the methodology metadata changes.
  if (
    plan?.schemaVersion === SCHEMA &&
    [
      "college-funding-4.0.0",
      "college-funding-5.0.0",
      "college-funding-6.0.0",
      "college-funding-7.0.0",
      "college-funding-8.0.0",
    ].includes(plan?.modelVersion)
  ) {
    plan = clone(plan);
    plan.modelVersion = MODEL;
  }

  if (plan?.schemaVersion !== SCHEMA || plan?.modelVersion !== MODEL)
    throw incompatiblePlan();
  object(
    plan,
    [
      "schemaVersion",
      "modelVersion",
      "currency",
      "valuation",
      "sharedPool",
      "family",
      "defaults",
      "students",
    ],
    "Plan",
  );
  if (plan.currency !== "USD") throw Error("Unsupported currency.");
  const now = month(plan.valuation);
  number(plan.sharedPool, 0, 1e8, "Shared pool");
  validateAssumptions(plan.defaults);
  array(plan.students, 30, "Students");
  if (!plan.students.length) throw Error("Keep at least one student.");
  object(plan.family, ["monthlyLimit", "scenarios"], "Household settings");
  if (plan.family.monthlyLimit !== null)
    number(plan.family.monthlyLimit, 0, 1e6, "Household monthly savings limit");
  if (
    !plan.family.scenarios ||
    typeof plan.family.scenarios !== "object" ||
    Array.isArray(plan.family.scenarios)
  )
    throw Error("Invalid household scenario choices.");
  for (const [sid, cid] of Object.entries(plan.family.scenarios))
    if (
      !plan.students.some(
        (st) => st.id === sid && st.scenarios.some((sc) => sc.id === cid),
      )
    )
      throw Error("Household scenario choice no longer exists.");
  const ids = new Set();
  let allocated = 0,
    totalScenarios = 0;
  const unique = (x) => {
    text(x, 100, "ID");
    if (ids.has(x)) throw Error("Duplicate IDs in plan.");
    ids.add(x);
  };
  for (const st of plan.students) {
    object(
      st,
      ["id", "alias", "enrollment", "sharedAllocation", "funding", "scenarios"],
      "Student",
    );
    unique(st.id);
    text(st.alias, 100, "Student alias");
    const entry = month(st.enrollment);
    if (entry - now > 480 || entry + 96 <= now)
      throw Error(
        "Choose enrollment within 40 years, with remaining attendance.",
      );
    number(st.sharedAllocation, 0, 1e8, "Shared allocation");
    allocated += st.sharedAllocation;
    const f = st.funding;
    object(
      f,
      [
        "balance",
        "monthly",
        "contributionStart",
        "contributionEnd",
        "stepUp",
        "gifts",
        "grant",
        "grantYears",
        "income",
        "coverage",
        "share",
        "assumptions",
        "history",
        "assumptionsDate",
        "assumptionsStatus",
        "stress",
      ],
      "Student funding",
    );
    for (const k of ["balance", "monthly", "grant", "income"])
      number(f[k], 0, k === "balance" ? 1e8 : 1e6, k);
    const start = month(f.contributionStart),
      end = month(f.contributionEnd);
    if (start < now || end < start || end > entry + 96)
      throw Error(
        "Contribution dates must start on/after valuation and end within eight years of enrollment.",
      );
    number(f.stepUp, 0, 0.2, "Contribution annual increase");
    number(f.grantYears, 0, 8, "General grant years", true);
    number(f.share, 0, 1, "Coverage fraction");
    if (!["full", "tuition", "percent"].includes(f.coverage))
      throw Error("Unknown coverage goal.");
    if (typeof f.stress !== "boolean") throw Error("Invalid stress setting.");
    month(f.assumptionsDate);
    if (!["illustrative", "user-defined"].includes(f.assumptionsStatus))
      throw Error("Unknown assumption status.");
    validateAssumptions(f.assumptions, investmentKeys);
    object(f.history, investmentHistoryKeys, "Student investment settings");
    if (
      !Object.hasOwn(PROFILES, f.history.profile) ||
      !["historical", "manual"].includes(f.history.reference)
    )
      throw Error("Unsupported investment settings.");
    number(f.history.fee, 0, 0.05, "Annual investment fee");
    array(f.history.allocations, 24, "Allocation changes");
    const dates = new Set();
    for (const change of f.history.allocations) {
      object(
        change,
        ["date", "stocks", "bonds", "cash", "referenceRate"],
        "Allocation change",
      );
      const date = month(change.date);
      if (date < now || date >= entry + 96 || dates.has(change.date))
        throw Error(
          "Allocation dates must be unique and within eight years of enrollment.",
        );
      dates.add(change.date);
      for (const k of ["stocks", "bonds", "cash"])
        number(change[k], 0, 1, "Allocation weight");
      if (Math.abs(change.stocks + change.bonds + change.cash - 1) > 1e-8)
        throw Error("Stocks, bonds and cash must total 100%.");
      if (change.referenceRate !== null)
        number(change.referenceRate, -0.99, 1, "Resolved reference rate");
    }
    array(f.gifts, 24, "Gifts");
    for (const g of f.gifts) {
      object(g, ["date", "amount"], "Gift");
      if (month(g.date) < now || month(g.date) >= entry + 96)
        throw Error("Gift date must be within eight years of enrollment.");
      number(g.amount, 0, 1e8, "Gift");
    }
    array(st.scenarios, 20, "Scenarios");
    if (!st.scenarios.length) throw Error("Each student needs a scenario.");
    totalScenarios += st.scenarios.length;
    for (const sc of st.scenarios) {
      object(
        sc,
        [
          "id",
          "name",
          "path",
          "living",
          "years",
          "baseline",
          "costs",
          "source",
          "sourceDate",
          "billing",
          "costSource",
          "history",
          "assumptions",
          "schoolGrant",
          "schoolGrantYears",
        ],
        "Education scenario",
      );
      unique(sc.id);
      text(sc.name, 100, "Scenario name");
      text(sc.path, 150, "Education path");
      text(sc.living, 100, "Living arrangement");
      text(sc.source, 500, "Cost source");
      number(sc.years, 1, 8, "Attendance years", true);
      if (entry + (sc.years - 1) * 12 + sc.billing.livingMonths <= now)
        throw Error("Each education scenario must have remaining attendance.");
      object(sc.billing, ["calendar", "livingMonths"], "Billing");
      if (
        !["semester", "quarter"].includes(sc.billing.calendar) ||
        ![9, 12].includes(sc.billing.livingMonths)
      )
        throw Error("Choose semester/quarter and 9/12 living months.");
      if (month(sc.baseline) > now || now - month(sc.baseline) > 480)
        throw Error("Cost baseline must be within 40 years before valuation.");
      month(sc.sourceDate);
      object(sc.costs, categories, "Annual costs");
      for (const k of categories) number(sc.costs[k], 0, 1e6, `${k} cost`);
      number(sc.schoolGrant, 0, 1e6, "School-specific grant");
      number(sc.schoolGrantYears, 0, 8, "School-specific grant years", true);
      validateAssumptions(sc.assumptions, expenseKeys);
      object(sc.history, educationHistoryKeys, "Education projection settings");
      if (
        !["full", "recent"].includes(sc.history.period) ||
        ![1, 3, 5].includes(sc.history.blockYears) ||
        !["historical", "fixed"].includes(sc.history.costMode) ||
        !["published", "index"].includes(sc.history.tuitionBasis)
      )
        throw Error("Unsupported historical settings.");
      object(
        sc.costSource,
        ["school", "academicYear", "residency", "url", "presetId", "modified"],
        "Cost source metadata",
      );
      for (const [key, max] of [
        ["school", 150],
        ["academicYear", 9],
        ["url", 1000],
        ["presetId", 100],
      ])
        if (
          typeof sc.costSource[key] !== "string" ||
          sc.costSource[key].length > max
        )
          throw Error("Invalid cost source metadata.");
      if (
        sc.costSource.academicYear &&
        (!/^\d{4}-\d{4}$/.test(sc.costSource.academicYear) ||
          Number(sc.costSource.academicYear.slice(5)) !==
            Number(sc.costSource.academicYear.slice(0, 4)) + 1)
      )
        throw Error("Academic year must span consecutive years.");
      if (
        !["unspecified", "in-state", "out-of-state", "private"].includes(
          sc.costSource.residency,
        ) ||
        typeof sc.costSource.modified !== "boolean"
      )
        throw Error("Invalid residency/source status.");
      if (sc.costSource.url) {
        let url;
        try {
          url = new URL(sc.costSource.url);
        } catch {
          throw Error("Enter a valid https source URL.");
        }
        if (url.protocol !== "https:" || url.username || url.password)
          throw Error(
            "Source URL must use https without embedded credentials.",
          );
      }
    }
  }
  if (totalScenarios > 100) throw Error("A plan allows at most 100 scenarios.");
  if (allocated > plan.sharedPool + 0.001)
    throw Error(
      "Student allocations exceed the shared pool. Reduce allocations or increase the pool.",
    );
  return plan;
}
export function parseImport(value) {
  if (typeof value !== "string" || value.length > 2_000_000)
    throw Error("Import must be a JSON file under 2 MB.");
  const raw = JSON.parse(value);
  object(raw, ["format", "exportedAt", "plan"], "Export");
  if (raw.format !== "education-finance-2") throw incompatiblePlan();
  if (
    typeof raw.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(raw.exportedAt))
  )
    throw Error("Invalid export date.");
  return clone(validatePlan(raw.plan));
}
export function exportPlan(plan) {
  return JSON.stringify(
    {
      format: "education-finance-2",
      exportedAt: new Date().toISOString(),
      plan: validatePlan(plan),
    },
    null,
    2,
  );
}
export function duplicateStudent(student) {
  const copy = clone(student);
  copy.id = id();
  copy.alias = `${copy.alias.slice(0, 85)} copy`;
  copy.sharedAllocation = 0;
  for (const k of ["balance", "monthly", "grant", "income"])
    copy.funding[k] = 0;
  copy.funding.gifts = [];
  for (const sc of copy.scenarios) {
    sc.id = id();
    sc.schoolGrant = 0;
  }
  return copy;
}
