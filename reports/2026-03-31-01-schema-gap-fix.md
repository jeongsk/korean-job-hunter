# EXP-027: Schema Gap Fix — Experience, Salary, Deadline, Reward Fields

**Date**: 2026-03-31
**Skill**: job-scraping + job-tracking
**Metric**: Field completeness / data persistence
**Verdict**: ✅ Keep

## Problem

The scraper agent extracts experience requirements, reward amounts, and (from JobKorea) deadline/salary data from job listings. However, the `jobs` table only had 9 columns and was missing `experience`, `salary`, `deadline`, and `reward`. This meant:

1. **Experience data lost**: The matcher needs experience requirements but data was never stored
2. **Salary invisible**: No way to persist or query compensation info
3. **Deadlines dropped**: JobKorea deadlines extracted but not saved
4. **Reward not stored**: Wanted referral bonuses extracted but discarded

## Changes

### Database Schema (jobs table)
- Added `experience TEXT` — e.g., "경력 5년 이상", "경력 3~7년"
- Added `salary TEXT` — e.g., "5000~8000만원", "연봉 1억 2000만원"
- Added `deadline TEXT` — e.g., "2026-04-15", "D-7"
- Added `reward TEXT` — e.g., "합격보상금 100만원"

### Scraper Agent (scraper-agent.md)
- Updated INSERT template to include all 4 new fields
- Added salary extraction section with patterns for:
  - Annual salary: `연봉 \d+만원`, `연봉 \d+억\s*\d*만원`
  - Salary ranges: `\d{4,}~\d{4,}만원`
  - Monthly: `월급?\s*\d+만원`
  - KRW format: `₩\d[\d,]+`
- Added salary extraction step to Wanted eval (Step 6)
- Updated JobKorea extraction to include salary field
- Updated output field list to include salary and deadline

### Tracker Agent (tracker-agent.md)
- Extended SELECT query to include experience, salary, deadline, reward
- Added filter keywords: 연봉/급여 → salary filter, 마감임박 → deadline filter, 경력 → experience filter

## Test Results

```
✅ Insert job with all new fields
✅ Insert job with minimal fields (experience/salary optional)
✅ Query jobs by experience range
✅ Query jobs with salary info
✅ Query jobs by deadline
✅ Tracker query with new fields
✅ Update existing job with new fields

7/7 passed
✅ jobs.db has all new columns
```

## Impact

| Metric | Before | After |
|--------|--------|-------|
| DB fields | 9 | 13 |
| Scraper fields lost | 3 (experience, reward, deadline) | 0 |
| Tracker query fields | 10 | 15 |
| Filter keywords | 8 | 11 |
| Salary extraction | Not implemented | 5 patterns |

## Next Steps

- EXP-028 could populate the new fields on existing jobs via re-scraping
- Matcher could use `experience` field for more precise scoring instead of relying on title parsing
- Deadline-aware scraping: prioritize jobs approaching deadline
