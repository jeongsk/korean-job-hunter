# EXP-091: Career Stage Pipeline + deriveCareerStage Deduplication

**Date:** 2026-04-04  
**Skill:** job-scraping + job-matching  
**Metric:** career_stage persistence

## Problem

Career stage (entry/junior/mid/senior/lead) was computed by all 3 post-processors but never persisted to the database. The matching algorithm gives 15% weight to career_stage, but against real scraped data it always returned 50 (neutral score), making it impossible to differentiate between entry-level and senior positions.

Additionally, `deriveCareerStage()` was duplicated in `post-process-wanted.js` and `post-process-jobkorea.js` — the same copy-paste pattern that EXP-080 fixed for skill-inference.

This is the third instance of the same gap pattern:
- EXP-077: skills computed but not persisted
- EXP-086: employment_type computed but not persisted  
- EXP-091: career_stage computed but not persisted

## Changes

1. **Added `deriveCareerStage()` to shared `skill-inference.js` module** — single source of truth for experience→stage mapping
2. **Removed local copies** from `post-process-wanted.js` and `post-process-jobkorea.js`, replaced with `require('./skill-inference')` import
3. **Added `career_stage TEXT` column** to jobs DB
4. **Updated `dedup-jobs.js`** — added career_stage to SELECT query and enrichFields array
5. **Updated `scraper-agent.md`** — added career_stage to INSERT template with documentation
6. **Created `test_career_stage_pipeline.js`** — 26 tests covering module sync, DB schema, dedup handling, and deriveCareerStage correctness

LinkedIn's `deriveCareerStage(level, minYears)` has a different signature (derives from title patterns rather than experience text) so it keeps its own local version.

## Results

| Metric | Before | After |
|--------|--------|-------|
| career_stage in DB | ❌ | ✅ |
| career_stage in dedup | ❌ | ✅ |
| deriveCareerStage deduplicated | ❌ (2 copies) | ✅ (shared module) |
| Total tests | 997 | 1023 |
| Regressions | — | 0 |

## Impact

The 15% career_stage weight in matching is now functional against real scraped data. Previously a 신입 (entry) job and a 10년차+ (senior) job both scored 50 for this component — now they correctly score 95 vs 40 depending on candidate experience years.
