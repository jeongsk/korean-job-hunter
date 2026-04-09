# EXP-172: Monthly Salary Prefix, 에서~사이 Range, 경력무관 Fix

**Date:** 2026-04-09
**Skill:** job-tracking
**Metric:** nlp_salary_query_capability

## Hypothesis

NLP salary parser only supported 연봉/급여/연수입 prefixes — 월급 (monthly salary) prefix was completely missing despite being common in Korean job conversations. The "에서~사이" range format (연봉 5000에서 8000 사이) was not parsed. 경력무관 keyword leaked into title/company LIKE search.

## Changes

1. **월급/월수입 salary prefix**: Added to salary regex with automatic monthly→annual conversion (×12). "월급 500 이상" → salary_min >= 6000.
2. **에서 separator**: Added `에서` as range separator alongside `~` and `-`. Works for both 만원 ranges (연봉 5000에서 8000) and 억 ranges (연봉 3에서 5억).
3. **경력무관 handling**: Added explicit 경력무관 detection before standalone 경력 check, consuming the full compound word to prevent keyword leak.
4. **StopWords**: Added 사이, 아니면, 월급, 월수입 to prevent keyword pollution.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Salary prefix support | 3 (연봉/급여/연수입) | 5 (+월급/월수입) |
| Range separators | 2 (~, -) | 3 (+에서) |
| 경력무관 keyword leak | Yes | Fixed |
| Test suites | 90 | 91 |
| Total tests | 1952 | 1963 |

## Examples

- `월급 500 이상` → `j.salary_min >= 6000` (monthly→annual)
- `연봉 5000에서 8000 사이` → `j.salary_min <= 8000 AND j.salary_max >= 5000`
- `경력무관 공고` → all stages filter, no keyword leak
- `백엔드 월급 400 이상 서울` → salary + skill + location filters

## Verdict: KEEP
