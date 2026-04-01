# EXP-060: Salary Normalization

**Date:** 2026-04-01  
**Skill:** job-scraping / job-tracking  
**Metric:** salary_comparability

## Hypothesis

Salary fields are stored as raw strings ("연봉 5000~8000만원", "월급 300~500만원", "면접후결정") making them impossible to compare, filter numerically, or use in NLP queries like "연봉 6000 이상". Normalizing to a canonical annual-만원 numeric range enables salary-based filtering and comparison.

## Changes

1. **normalizeSalary(raw)** — parses Korean salary formats to `{min, max, annual}`:
   - 만원 ranges: `5000~8000만원`, `5000-8000만원`, `8,000~12,000만원`
   - Single values: `6000만원 이상`, `5500만원`
   - Monthly → annual auto-conversion: `월급 300~500만원` → `{min: 3600, max: 6000}`
   - 억 units: `1억` → 10000, `1~1.5억` → `{min: 10000, max: 15000}`
   - Negotiable detection: `면접후결정`, `회사내규`, `협의` → `null`

2. **salaryMeetsThreshold(normalized, threshold)** — for NLP queries
3. **salaryInRange(normalized, wantMin, wantMax)** — range overlap filter (negotiable passes)

4. Updated SKILL.md v4.6 with normalization section and inline JS
5. Updated tracker-agent.md with salary threshold NLP patterns

## Results

| Metric | Before | After |
|--------|--------|-------|
| Salary normalization tests | 0 | 23/23 |
| Salary comparable formats | 0 | 6 (만원 range, single, monthly, 억, comma, negotiable) |
| Total tests | 523 | 546 |
| Regressions | — | 0 |

## Bug Found & Fixed

억 range parser (`1~1.5억`) initially returned only max value for both min and max — the range regex wasn't tried before the single-억 regex. Fixed by checking 억 range pattern first.

## Impact

This enables:
- NLP queries: "연봉 6000 이상 공고 있어?" → filter by normalized salary
- Salary comparison across sources (Wanted uses 만원, some jobs use 억)
- Monthly salary auto-converted to annual for consistent comparison
- Tracker can now meaningfully filter and sort by salary

## Next Steps

- Integrate normalizeSalary into the NLP parser v4 for automatic salary threshold extraction from Korean queries
- Add salary column to the jobs DB as a normalized numeric field (optional, for SQL-level filtering)
