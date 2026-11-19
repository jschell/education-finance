// Read-only feasibility census. Run from the education-finance repository root.
// This counts existing revised-data outcomes; it makes no forecasts or fits.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const mod = p => import(pathToFileURL(resolve(p)).href);
const { SECTORS, parseSchools, cohortAt, outcomeLevels } = await mod('scripts/calibration/schools.mjs');
const { parseCpi } = await mod('scripts/cost-followup-helpers.mjs');
const table = parseSchools(gunzipSync(readFileSync('data/raw/ipeds/selected.csv.gz')).toString());
const cpi = parseCpi(readFileSync('data/raw/cpi.csv', 'utf8'));
for (const start of [2003, 2005]) for (const wait of [0, 4, 8]) {
  let selected = 0, observed = 0;
  const byOrigin = [], unique = new Set();
  for (let origin = start; origin + wait + 3 <= 2023; origin++) {
    let count = 0;
    for (const sector of Object.keys(SECTORS)) {
      const cohort = cohortAt(table, origin, sector, cpi);
      for (const school of [...cohort.known, ...cohort.unknown]) {
        selected++;
        if (outcomeLevels(table, school.unitid, origin, origin + wait + 3, sector, cpi).status === 'observed') {
          count++; observed++; unique.add(school.unitid);
        }
      }
    }
    byOrigin.push([origin, count]);
  }
  const nonoverlapping = [];
  for (const [origin, n] of byOrigin) if (n && (!nonoverlapping.length || origin > nonoverlapping.at(-1)[1])) {
    nonoverlapping.push([origin, origin + wait + 3]);
  }
  console.log(JSON.stringify({ start, wait, selected, observed,
    observedOrigins: byOrigin.filter(x => x[1]).length,
    uniqueSchools: unique.size, nonoverlapping, byOrigin }));
}
