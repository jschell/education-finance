# Published school-budget snapshots

Verified 2026-11-15. Nominal USD for academic year 2026-2027, before grants. Baseline 2026-09; model spreads living costs over nine months by default. Actual institutional budgets and eligible expenses differ. These numbers are public-source snapshots; no private workbook/student data was copied into the repository.

| Preset | Tuition and fees | Housing and food | Books/supplies | Travel | Other | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Public four-year in-state | 12,290 | 14,430 | 1,370 | 1,430 | 2,510 | 32,030 |
| Public four-year out-of-state | 32,730 | 14,430 | 1,370 | 1,430 | 2,510 | 52,470 |
| Private nonprofit four-year | 46,350 | 16,570 | 1,380 | 1,230 | 2,080 | 67,610 |
| Harvard College example | 68,442 | 23,192 | 1,000 | 5,000 | 2,500 | 100,134 |

National sectors: [College Board 2026 report, Figure CP-1, printed page 11](https://research.collegeboard.org/media/pdf/trends-in-college-pricing-and-student-aid-2026.pdf). Source: Ma, Jennifer, Matea Warner, and Ashley Edwards (2026). Trends in College Pricing and Student Aid 2026, New York: College Board. © 2026 College Board. The report permits reproduction/citation for noncommercial purposes with attribution. These source observations are separate from the MIT application code.

High-cost private example: [Harvard College 2026-2027 cost of attendance](https://college.harvard.edu/financial-aid/how-aid-works). Tuition 62,226 plus fees 6,216; housing 14,250 plus food 8,942. The published travel range is 0–5,000; this example uses the upper end and includes 2,500 personal expenses under Other. Conditional 4,954 health insurance is excluded and must be added if not waived. This is one university's budget, not an Ivy League/elite average.

Preset application preserves savings, grants, contributions, gifts, income and tuition calendar; it replaces all five expense categories, budget baseline, source metadata and living-month coverage. No automatic aid percentage is deducted. Editing costs or living coverage marks the budget adapted. The implementation is in site/js/cost-presets.js and category totals are tested independently.
