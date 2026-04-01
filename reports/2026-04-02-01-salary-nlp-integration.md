# EXP-061: Salary NLP Integration

**Date:** 2026-04-02
**Skill:** job-tracking / job-scraping
**Metric:** salary_query_capability

## Hypothesis

Salary normalization from EXP-060 exists but isn't wired into the NLP parser. Queries like "연봉 6000 이상" only checked if salary exists (`IS NOT NULL`), not its numeric value. Integrating normalizeSalary into the NLP parser with `salary_min`/`salary_max` DB columns enables proper threshold and range filtering.

## Changes

1. **salary_min/salary_max INTEGER columns** added to jobs table (populated by normalizeSalary during scraping)
2. **NLP parser v4** with salary threshold support:
   - `연봉 6000 이상` → `j.salary_min >= 6000`
   - `연봉 5000~8000` → range overlap filter
   - `연봉 1억 이상` → `j.salary_min >= 10000` (억→만원 auto-convert)
   - Generic `연봉 공고` → existence check with normalized column
3. **Bug fixes found during integration:**
   - Negation: "카카오 빼고" now correctly generates `NOT LIKE` (was broken because company appeared before negation word)
   - Keyword leak: salary numbers and 년차 no longer leak into title/company search
   - StopWords expanded: 만원, 이상, 부터, 년차 added
4. Updated scraper-agent.md with salary_min/salary_max columns and normalizeSalary guidance
5. Updated job-tracking SKILL.md with salary threshold query documentation

## Results

| Metric | Before | After |
|--------|--------|-------|
| Salary NLP tests | 0 | 19/19 |
| Salary threshold queries | not supported | full 만원/억 support |
| Salary range overlap | not supported | range overlap filter |
| Negation bug (카카오 빼고) | broken | fixed |
| Keyword leak (salary numbers) | leaking to title | properly consumed |
| Total tests | 546 | 586 |
| Regressions | — | 0 |

## Impact

Users can now query naturally:
- "연봉 6000 이상 공고 있어?" → filters by minimum salary
- "토스 연봉 5000 이상" → company + salary composite
- "연봉 5000~8000 관심 공고" → range overlap + status

The salary_min/salary_max columns bridge the gap between raw salary strings (EXP-060 normalization) and SQL-level numeric filtering.
