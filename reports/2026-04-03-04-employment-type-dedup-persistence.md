# EXP-086: Employment Type DB Persistence and Dedup Pipeline Sync

**Date:** 2026-04-03
**Skill:** job-scraping
**Focus:** employment_type field persistence gap

## Problem

EXP-085 added `employment_type` extraction (regular/contract/intern/freelance) to all 3 post-processors, but the field was never wired into the production pipeline:

1. **No DB column** — `employment_type` didn't exist in the `jobs` table, so INSERTs silently dropped it
2. **Dedup blind** — `dedup-jobs.js` didn't SELECT, score, or enrich `employment_type`, meaning cross-source dedup could lose the field

Same pattern as EXP-081 (skills/culture_keywords dedup gap) and EXP-077 (skills column persistence gap).

## Changes

1. **DB schema**: `ALTER TABLE jobs ADD COLUMN employment_type TEXT DEFAULT 'regular'`
2. **dedup-jobs.js**: Added `employment_type` to SQL SELECT, `fieldScore()` (non-default +1 point), and `enrichFields` (8 fields now enriched on merge)
3. **scraper-agent.md**: Updated INSERT template to include `employment_type` column
4. **test_employment_type_dedup.js**: 12 tests validating end-to-end pipeline (fieldScore, enrichment, SQL query, DB schema, INSERT template, all 3 post-processors)

## Results

| Metric | Before | After |
|--------|--------|-------|
| employment_type in DB | ❌ no column | ✅ TEXT DEFAULT 'regular' |
| employment_type in dedup SELECT | ❌ missing | ✅ included |
| employment_type in dedup enrichment | ❌ missing | ✅ 8th enrichField |
| employment_type in INSERT template | ❌ missing | ✅ included |
| Validation tests | 0 | 12/12 |
| Total tests | 938 | 950 |
| Regressions | — | 0 |

## Commit

`01e754d` — pushed to main
