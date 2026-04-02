# EXP-082: Salary Threshold NLP Queries

**Date:** 2026-04-03
**Skill:** job-tracking
**Metric:** nlp_salary_query_capability

## Hypothesis

The main NLP parser (test_korean_nlp_v3.js) only supported basic "연봉 있는" (has salary) queries. Salary threshold parsing (연봉 6000 이상, 연봉 5000~8000, 연봉 1억 이상) existed only in the separate test_salary_nlp_integration.js with its own duplicated parser. Users querying the tracker with natural salary thresholds would get all jobs with any salary instead of filtered results.

## Change

Merged salary threshold parsing from test_salary_nlp_integration.js into the main NLP parser (test_korean_nlp_v3.js):

1. **억 range:** 연봉 1~2억 → `(j.salary_min <= 20000 AND j.salary_max >= 10000)`
2. **억 threshold:** 연봉 1억 이상 → `j.salary_min >= 10000`
3. **만원 range:** 연봉 5000~8000 → `(j.salary_min <= 8000 AND j.salary_max >= 5000)`
4. **만원 threshold:** 연봉 6000 이상 → `j.salary_min >= 6000`
5. **Fallback:** 연봉 있는 → `j.salary IS NOT NULL AND j.salary != ''` (unchanged)

6 new test cases covering all patterns + composites with status/location filters.

## Results

| Metric | Before | After |
|--------|--------|-------|
| NLP v3 tests | 50 | 56 |
| Salary threshold queries | 0 | 6 |
| Total tests | 878 | 884 |
| Regressions | 0 | 0 |

All 6 new test cases pass. All 884 tests across 43 suites pass with 0 regressions.

## Test Cases

| ID | Input | Filter |
|----|-------|--------|
| 51 | 연봉 6000 이상 공고 | `j.salary_min >= 6000` |
| 52 | 연봉 5000~8000 공고 | range overlap |
| 53 | 연봉 1억 이상 | `j.salary_min >= 10000` |
| 54 | 연봉 1~2억 공고 | range overlap (억) |
| 55 | 급여 8000부터 관심 공고 | threshold + status |
| 56 | 연봉 5000~7000 서울 | range + location |

## Files Changed

- `test_korean_nlp_v3.js` — salary threshold parsing + 6 test cases
- `skills/job-tracking/SKILL.md` — v2.7
- `agents/tracker-agent.md` — v3.4

## Verdict: KEEP ✅
