# EXP-057: Wanted Salary Extraction

**Date:** 2026-04-01
**Skill:** job-scraping
**Metric:** Salary field extraction for Wanted source

## Hypothesis
Adding standalone `면접후결정` salary capture and salary test coverage for Wanted post-processor fixes title pollution and closes the salary test gap between Wanted and JobKorea.

## Problem
1. **Standalone `면접후결정` leaked to title**: When Wanted listing text contains `면접후결정` without a `연봉`/`월급` prefix, it wasn't captured as salary and polluted the title field (e.g., title became "DevOps Engineer 면접후결정")
2. **Zero salary tests for Wanted**: JobKorea had salary tests since EXP-046 (4 cases), but Wanted post-processor had 0 salary test cases despite having salary regex since EXP-027

## Changes
1. **`scripts/post-process-wanted.js`**: Added standalone `면접후결정` capture after the prefixed salary regex
2. **`test_post_process_wanted.js`**: Added 5 salary test cases:
   - `salary-range-wanted`: 연봉 5000~8000만원
   - `salary-single-value-wanted`: 연봉 6000만원 이상
   - `salary-negotiable-standalone-wanted`: 면접후결정 (no prefix)
   - `salary-negotiable-with-prefix-wanted`: 연봉 면접후결정
   - `salary-no-leak-to-title`: verifies salary doesn't appear in title
3. **`skills/job-scraping/SKILL.md`**: Updated to v4.4 with salary extraction docs

## Results
- Post-process Wanted tests: 15/15 → **20/20** (100%)
- Salary test cases: 0 → **5**
- Standalone 면접후결정: leaked to title → **captured as salary**
- All 21 test suites: **PASS** (0 regressions)

## Example Fix
**Before:**
```
Input: "DevOps Engineer라인경력무관면접후결정합격보상금 50만원"
salary: ""
title: "DevOps Engineer 면접후결정"  ← polluted!
```

**After:**
```
Input: "DevOps Engineer라인경력무관면접후결정합격보상금 50만원"
salary: "면접후결정"  ← correctly captured
title: "DevOps Engineer"  ← clean
```

## Files Changed
- `scripts/post-process-wanted.js`: +standalone 면접후결정 capture
- `test_post_process_wanted.js`: +5 salary test cases
- `skills/job-scraping/SKILL.md`: v4.4
- `data/autoresearch/baseline.json`: updated
- `data/autoresearch/experiments.jsonl`: EXP-057 entry

## Commit
`EXP-057` — pushed to main
