# EXP-047: End-to-End Pipeline Integration Tests

**Date:** 2026-04-01  
**Skill:** All (cross-cutting)  
**Focus:** Full pipeline integration verification  
**Verdict:** ✅ Keep

## Hypothesis

Individual component tests (parsing, matching, NLP queries, dedup) pass in isolation, but there's no test verifying the complete data flow from raw scraped text through to queryable results. Integration gaps between components could exist.

## What Changed

Created `test_e2e_pipeline.js` with 39 tests across 6 phases:

1. **Scrape Parsing** (6 tests) — Wanted and JobKorea raw text → structured fields
2. **Matching Pipeline** (5 tests) — HIGH/LOW discrimination, skill gate, domain penalty
3. **Cross-Source Dedup** (3 tests) — ko↔en title mapping, duplicate detection
4. **Korean NLP Query Parsing** (9 tests) — status, company, negation, location, deadline, sorting
5. **Full Pipeline Simulation** (8 tests) — 5 raw jobs from 3 sources → parse → dedup → match → rank → query
6. **Deadline Urgency** (5 tests) — urgency level computation from deadline strings

## Results

| Metric | Value |
|--------|-------|
| New tests | 39/39 (100%) |
| Existing tests | All pass (0 regressions) |
| Pipeline phases verified | 6/6 |
| Discrimination gap verified | ✅ (HIGH ≥ 70, LOW ≤ 25) |

## Key Findings

- No integration gaps found — the pipeline flows cleanly from scraping through matching to querying
- Korean NLP query parser correctly handles composite queries (status + company + negation)
- Cross-source dedup correctly identifies same job across Wanted/JobKorea/LinkedIn
- Frontend jobs correctly score higher than backend jobs for a JS/React candidate
- Deadline urgency integrates properly with parsed JobKorea deadline format

## Files Changed

- `test_e2e_pipeline.js` — new file (542 lines)
