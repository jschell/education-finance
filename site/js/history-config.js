export const DATASET_ID = "us-joint-monthly-1978-2024-v1";
export const HISTORY_PRNG = "mulberry32-calendar-block-1";
export const HISTORY_DEFAULTS = {
  profile: "balanced",
  period: "full",
  blockYears: 3,
  costMode: "historical",
  reference: "historical",
  fee: 0,
  tuitionBasis: "published",
};
export const PROFILES = {
  balanced: {
    name: "Balanced to conservative",
    stages: [
      [0.6, 0.3, 0.1],
      [0.3, 0.4, 0.3],
      [0.1, 0.3, 0.6],
    ],
  },
  growth: {
    name: "Stock-heavy to conservative",
    stages: [
      [0.8, 0.15, 0.05],
      [0.5, 0.35, 0.15],
      [0.2, 0.3, 0.5],
    ],
  },
  cautious: {
    name: "Conservative",
    stages: [
      [0.3, 0.4, 0.3],
      [0.15, 0.35, 0.5],
      [0, 0.2, 0.8],
    ],
  },
  cash: {
    name: "Cash only",
    stages: [
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
  },
};
export const periodLabel = (period) =>
  period === "recent" ? "2000–2024" : "1978–2024";
