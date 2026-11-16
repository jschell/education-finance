import { month } from "./domain.js?v=0.10.0";
export const termOffsets = (calendar) =>
  calendar === "quarter" ? [0, 3, 6] : [0, 5];
export function allocationAt(date, allocations) {
  let current = null;
  for (const entry of allocations)
    if (entry.date <= date && (!current || entry.date > current.date))
      current = entry;
  return current;
}
export function attendanceCalendar(plan) {
  const start = month(plan.valuation),
    months = new Map();
  for (const student of plan.students)
    for (
      let y = 0;
      y <
      (
        student.scenarios.find(
          (s) => s.id === plan.family.scenarios[student.id],
        ) || student.scenarios[0]
      ).years;
      y++
    )
      for (let m = 0; m < 9; m++) {
        const date = month(student.enrollment) + y * 12 + m;
        if (date < start) continue;
        if (!months.has(date)) months.set(date, new Set());
        months.get(date).add(student.id);
      }
  const years = [
    ...new Set([...months.keys()].map((m) => Math.floor(m / 12))),
  ].sort((a, b) => a - b);
  return years.map((year) => {
    const counts = Object.fromEntries(plan.students.map((s) => [s.id, 0]));
    let peak = 0;
    for (let m = 0; m < 12; m++) {
      const attending = months.get(year * 12 + m) || new Set();
      peak = Math.max(peak, attending.size);
      for (const id of attending) counts[id]++;
    }
    return { year, peak, counts };
  });
}
