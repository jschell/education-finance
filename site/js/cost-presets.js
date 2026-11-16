import { clone, month } from "./domain.js?v=0.10.0";
const board =
  "https://research.collegeboard.org/media/pdf/trends-in-college-pricing-and-student-aid-2026.pdf";
const common = {
  academicYear: "2026-2027",
  baseline: "2026-09",
  sourceDate: "2026-11",
  asOf: "2026-11-15",
  livingMonths: 9,
};
export const COST_PRESETS = {
  "public-in-2026": {
    ...common,
    name: "Public four-year · in-state average",
    path: "Public in-state",
    residency: "in-state",
    school: "US public four-year average",
    source:
      "College Board, Trends in College Pricing and Student Aid 2026, Figure CP-1",
    url: board,
    costs: {
      tuition: 12290,
      housing: 14430,
      books: 1370,
      transport: 1430,
      other: 2510,
    },
    total: 32030,
    note: "National on-campus budget before grants. Category allowances can differ from actual spending.",
  },
  "public-out-2026": {
    ...common,
    name: "Public four-year · out-of-state average",
    path: "Public out-of-state",
    residency: "out-of-state",
    school: "US public four-year average",
    source:
      "College Board, Trends in College Pricing and Student Aid 2026, Figure CP-1",
    url: board,
    costs: {
      tuition: 32730,
      housing: 14430,
      books: 1370,
      transport: 1430,
      other: 2510,
    },
    total: 52470,
    note: "National on-campus budget before grants. Category allowances can differ from actual spending.",
  },
  "private-2026": {
    ...common,
    name: "Private nonprofit · national average",
    path: "Private nonprofit",
    residency: "private",
    school: "US private nonprofit four-year average",
    source:
      "College Board, Trends in College Pricing and Student Aid 2026, Figure CP-1",
    url: board,
    costs: {
      tuition: 46350,
      housing: 16570,
      books: 1380,
      transport: 1230,
      other: 2080,
    },
    total: 67610,
    note: "National on-campus budget before grants. Category allowances can differ from actual spending.",
  },
  "harvard-2026": {
    ...common,
    name: "High-cost private · Harvard example",
    path: "High-cost private",
    residency: "private",
    school: "Harvard College",
    source: "Harvard College, published 2026-2027 cost of attendance",
    url: "https://college.harvard.edu/financial-aid/how-aid-works",
    costs: {
      tuition: 68442,
      housing: 23192,
      books: 1000,
      transport: 5000,
      other: 2500,
    },
    total: 100134,
    note: "Specific university example, not an elite-school average. Uses the upper $5,000 travel allowance. Personal expenses are in Other. Conditional $4,954 health insurance is excluded; add it if not waived. Before grants.",
  },
};
export function applyCostPreset(scenario, key, valuation) {
  const preset = COST_PRESETS[key];
  if (!preset) throw Error("Choose a listed school-cost estimate.");
  if (month(preset.baseline) > month(valuation))
    throw Error(
      "This estimate starts in September 2026. Choose a later valuation or enter your own earlier budget.",
    );
  const s = clone(scenario);
  s.history.tuitionBasis = "published";
  s.costs = clone(preset.costs);
  s.path = preset.path;
  s.living = "On campus";
  s.baseline = preset.baseline;
  s.source = preset.source;
  s.sourceDate = preset.sourceDate;
  s.billing.livingMonths = preset.livingMonths;
  s.costSource = {
    school: preset.school,
    academicYear: preset.academicYear,
    residency: preset.residency,
    url: preset.url,
    presetId: key,
    modified: false,
  };
  return s;
}
