# EXP-175: Korean Number-Word Salary Ranges + StopWord Leak Fixes

**Date:** 2026-04-10
**Skill:** job-tracking (NLP parser)
**Verdict:** ✅ Keep

## Problem

The NLP parser couldn't handle Korean number-word salary ranges:
- `연봉 4천에서 6천` → "천에서" leaked into title/company search instead of parsing as salary range 4000-6000
- `연봉 5천 이상` → "천" leaked instead of becoming salary_min >= 5000
- `근처`, `신입가능`, `연차` also leaked into title/company LIKE queries

Root cause: `manRange` regex only matched `\d[\d,]*` (digits), so Korean number words like 천 (thousand) were invisible to salary parsing. The leftover text then fell through to the generic Korean word → title/company search.

## Changes

### scripts/nlp-parser.js
1. **cheonRange regex**: `(연봉|...) (N)천 (에서|~|-) (M)천 (만원)?` → salary range N000-M000
2. **cheonSingle regex**: `(연봉|...) (N)천 (만원)?` → salary_min >= N000
3. **Monthly conversion**: 월급 3천 이상 → salary_min >= 36000 (×12)
4. **stopWords added**: 근처, 근교, 인근, 신입가능, 신입 가능, 연차
5. **consumedWords**: Added '천에서' to prevent particle-stripped leak

### test_nlp_cheon_range.js
12 new test cases covering all patterns.

## Results

| Query | Before | After |
|-------|--------|-------|
| 연봉 4천에서 6천 | "천에서" leak | salary range 4000-6000 ✅ |
| 연봉 5천 이상 | "천" leak | salary_min >= 5000 ✅ |
| 연봉 3천~5천만원 | broken | salary range 3000-5000 ✅ |
| 판교 근처 C++ | "근처" leak | clean ✅ |
| 신입가능 Node.js | "신입가능" leak | clean ✅ |
| 연차 5년 이상 | "연차" leak | clean ✅ |
| 연봉 5000~8000 | working | still working ✅ |
| 연봉 1~2억 | working | still working ✅ |

**Zero regressions.** Matching metrics unchanged (discrimination: 74.53, all 10 baseline tests pass).
