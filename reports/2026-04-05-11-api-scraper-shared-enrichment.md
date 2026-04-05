# EXP-119: Wanted API Scraper Shared Enrichment Integration

**Date:** 2026-04-05 10:04 KST
**Skill:** job-scraping
**Focus:** api_scraper_enrichment_parity

## Hypothesis

The Wanted API scraper (scrape-wanted-api.js, created to bypass 403 bot detection) had its own inline SKILL_PATTERNS (35 patterns) instead of using the shared 135-skill inference module. It also completely missed culture keyword extraction, salary normalization, deadline normalization, career stage derivation, and work type detection — all features built and validated across EXP-063 through EXP-117. API-scraped jobs would have empty enriched fields, making matching (35% skill, 15% culture, 15% career stage weights) non-functional for the new primary scraping method.

## Gap Analysis

| Feature | Browser Pipeline | API Scraper (before) | API Scraper (after) |
|---------|-----------------|---------------------|-------------------|
| Skill inference | 135 skills (shared) | 35 skills (inline) | 135 skills (shared) |
| Korean skill detection | ✅ | ❌ | ✅ |
| Culture keywords | 7 categories | ❌ | 7 categories |
| Salary normalization | full pipeline | ❌ | full pipeline |
| Deadline normalization | 8 formats | ❌ (raw text) | 8 formats |
| Career stage | 5 levels | ❌ | 5 levels |
| Work type detection | Korean+English | ❌ (hardcoded onsite) | Korean+English |
| False positive prevention | word boundaries | ❌ | word boundaries |

## Change

- Replaced inline `SKILL_PATTERNS` (35 patterns) with `require('./skill-inference')` (135+ skills)
- Imported `extractCultureKeywords`, `normalizeSalary`, `normalizeDeadline` from post-process-wanted
- Added `detectWorkType()` function with Korean/English patterns
- Added `deriveCareerStage()` call in `parsePosition()` for career stage from experience text
- Updated `fetchDetail()` to accept title parameter for better skill inference
- Added `employment_type` mapping: `full_time` → `regular`
- Added enrichment fields to output: `career_stage`, `culture_keywords`, `salary_min`, `salary_max`, `deadline_raw`
- Created test_api_scraper_enrichment.js with 19 tests

## Results

| Metric | Before | After |
|--------|--------|-------|
| API skill patterns | 35 | 135+ |
| API enrichment modules | 0 | 5 |
| API enrichment fields | 0 | 6 new fields |
| Total tests | 1374 | 1393 |
| Regressions | 0 | 0 |

## Impact

API-scraped jobs now have the same enrichment quality as browser-scraped jobs. Since the API scraper is now the PRIMARY method for Wanted (browser method returns 403), this ensures the matching algorithm's full weight distribution (35% skills, 25% experience, 15% culture, 15% career stage, 10% location/work/salary) is functional for the primary data source.
