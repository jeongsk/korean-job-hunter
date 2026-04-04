# EXP-109: Dedup Content + Office Address Enrichment

**Date:** 2026-04-04
**Skill:** job-scraping
**Metric:** dedup_data_completeness

## Hypothesis

Dedup enrichment fields were missing `content` (full JD text) and `office_address` (detailed address for commute calculation). When a duplicate with richer JD text lost the fieldScore tie-breaker, the detailed job description was silently discarded. Same for office addresses needed for commute time estimation.

Additionally, the MCP server lacked indexes on `deadline`, `career_stage`, and `employment_type` — columns used by NLP deadline queries, career stage filters, and employment type filters respectively.

## Changes

1. Added `content` and `office_address` to `enrichFields` array in `dedup-jobs.js`
2. Added `office_address` to `fieldScore()` function (+1 bonus) 
3. Added `office_address` to SQL SELECT query in dedup script
4. Added 3 indexes to MCP server schema: `idx_jobs_deadline`, `idx_jobs_career_stage`, `idx_jobs_employment_type`
5. Created `test_dedup_content_enrichment.js` with 6 test cases

## Results

| Metric | Before | After |
|--------|--------|-------|
| enrichFields count | 9 | 11 |
| DB indexes | 8 | 11 |
| Total tests | 1279 | 1285 |
| Regressions | 0 | 0 |

## Impact

Full JD content and detailed office addresses now survive cross-source dedup merge. Previously if a LinkedIn listing (which typically has minimal content) won the fieldScore tie-breaker over a Wanted listing (rich JD), the detailed job description was lost forever. The 3 new indexes improve query performance for deadline-based NLP queries (마감임박, 오늘 마감), career stage filters (시니어, 주니어), and employment type filters (정규직, 계약직).
