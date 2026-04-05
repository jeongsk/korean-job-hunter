# EXP-131: Search-Time Skill Extraction for API Scraper

**Date:** 2026-04-05
**Skill:** job-scraping+job-matching
**Metric:** skill_extraction_at_search_time
**Verdict:** KEEP

## Hypothesis

`parsePosition()` in `scrape-wanted-api.js` always returned `skills: []`. Skills were only populated when using the `--details` flag (N extra HTTP requests per job). For users scraping without detail enrichment, the matching algorithm's 35% skill weight scored 0 for all API-sourced jobs — making them indistinguishable by skill domain.

Additionally, Korean abbreviated role title "프론트" (short for 프론트엔드) and English "Frontend" were missing from `ROLE_SKILL_MAP`, causing zero skill inference for these common real-world title patterns.

## Change

1. **Added `inferSkills(title)` call in `parsePosition()`** — runs the shared skill-inference module (135+ SKILL_MAP entries + 30 ROLE_SKILL_MAP entries) on the job title at search time, before any detail fetch.

2. **Added `프론트` and `frontend` to `ROLE_SKILL_MAP`** — both map to `['react', 'typescript', 'javascript']`, matching the existing `프론트엔드` entry.

3. **Created `test_api_search_skills.js`** with 16 test cases covering Korean role titles, English titles, explicit tech keywords, career stage derivation, real API responses from April 2026, and edge cases.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Skills for "프론트엔드 개발자" (no details) | `[]` | `[react, typescript, javascript]` |
| Skills for "Frontend Engineer" (no details) | `[]` | `[react, typescript, javascript]` |
| Skills for "프론트 개발자" (abbreviated) | `[]` | `[react, typescript, javascript]` |
| ROLE_SKILL_MAP entries | 28 | 30 |
| Total tests | 1593 | 1609 |
| Test suites | 61 | 62 |
| Regressions | 0 | 0 |

### Real-World Validation

Tested against live Wanted API with keyword "프론트엔드":
- 11/12 jobs now get meaningful skills from title alone
- Only "Product Engineer" (generic title) correctly gets empty skills
- Previously ALL 12 would have `skills: []` without `--details`

## Impact

The 35% skill matching weight is now functional for API-scraped jobs even without the expensive detail page fetch. This is especially important because:
- Detail fetch requires N additional HTTP requests (one per job)
- Many users scrape without `--details` for speed
- The matching algorithm's discrimination depends heavily on skill overlap

The `--details` flag still adds value by extracting skills from full JD descriptions (not just titles), but basic matching discrimination is now available at search time.
