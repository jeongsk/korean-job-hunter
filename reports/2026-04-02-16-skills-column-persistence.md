# EXP-077: Skills Column Persistence

**Date**: 2026-04-02  
**Skill**: job-scraping (schema)  
**Metric**: field_persistence_gap  

## Hypothesis

The `skills` field was parsed by all 3 post-processors (Wanted, JobKorea, LinkedIn via title inference and detail extraction) but never persisted to the jobs database. The matcher-agent either re-extracted skills on every run or relied solely on title-based inference (EXP-052), degrading matching quality for jobs where detail-page skills had already been extracted.

## Change

- Added `skills TEXT DEFAULT ''` column to jobs table via ALTER TABLE
- Updated scraper-agent.md INSERT template to include skills in column list
- Added UPDATE workflow for detail-page skill enrichment
- Updated SKILL.md v5.2 with skills persistence documentation
- Updated schema validation test (EXP-027) to check skills column

## Baseline

| Metric | Before |
|---|---|
| skills column in DB | ❌ missing |
| skills in INSERT template | ❌ missing |
| skills queryable via SQL | ❌ impossible |
| matcher re-extraction needed | always |

## Results

| Metric | After |
|---|---|
| skills column in DB | ✅ TEXT DEFAULT '' |
| skills in INSERT template | ✅ included |
| skills queryable via SQL | ✅ LIKE, NOT NULL, UPDATE |
| detail-page enrichment | ✅ UPDATE after extraction |
| new tests | 15/15 (100%) |
| total tests | 845 |
| regressions | 0 |

## Test Coverage

15 new tests covering:
- Schema: column exists, TEXT type, empty default
- INSERT: with skills, without skills (default), Korean+English skills
- Query: LIKE, NOT NULL/empty, multi-skill AND
- Matching integration: skills from DB feed scoring, empty triggers inference fallback
- UPDATE: detail-page enrichment, cross-source dedup preserves richer skills
- Migration: ALTER TABLE on existing schema

## Impact

This closes a real data pipeline gap. Previously the matching algorithm's 35% skill weight relied on runtime extraction or inference. Now skills persist from:
1. Title-based inference (EXP-052) at scrape time
2. Detail-page skill extraction (EXP-059) at enrichment time
3. Both feed directly into the matcher via SQL query

The matcher-agent can now query `SELECT skills FROM jobs` instead of re-running inference.
