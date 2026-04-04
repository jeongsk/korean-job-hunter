# EXP-110: Office Address DB Column Fix

**Date:** 2026-04-05 00:04 KST
**Skill:** job-scraping
**Component:** DB schema + dedup pipeline
**Metric:** dedup_pipeline_functional

## Hypothesis

`office_address` was added to dedup-jobs.js SELECT query, fieldScore(), and enrichFields array in EXP-109, but the column was never created in the jobs DB schema. This causes the entire dedup script to crash with `no such column: office_address`, making cross-source deduplication completely non-functional since EXP-109.

## Root Cause

Same gap pattern as EXP-077 (skills), EXP-086 (employment_type), EXP-091 (career_stage): production code references a field that was added to test logic but never added to the actual DB schema. The schema test (test_schema_exp027.js) only validated the original 6 columns from EXP-027, missing all subsequently-added columns.

## Changes

1. Added `office_address TEXT DEFAULT ''` column to jobs.db via ALTER TABLE
2. Expanded schema validation in test_schema_exp027.js from 6 to 11 required columns (added employment_type, career_stage, salary_min, salary_max, office_address)
3. Added `office_address` to scraper-agent.md INSERT template and Field Schema table

## Results

| Metric | Before | After |
|--------|--------|-------|
| dedup script | CRASHES (no such column) | WORKING |
| schema validation columns | 6 | 11 |
| Total tests | 1285 | 1285 |
| Regressions | 0 | 0 |

## Impact

Cross-source dedup pipeline restored to functional state. Without this fix, every dedup run since EXP-109 would crash, meaning all scraped jobs would accumulate duplicates indefinitely. The expanded schema validation ensures future schema gaps are caught immediately.
