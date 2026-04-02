# EXP-071: E2E Pipeline Test Synced with Production Parsers

**Date**: 2026-04-02
**Skill**: e2e-pipeline (cross-cutting)
**Status**: ✅ Keep (43/43 tests pass, 0 regressions)

## Problem

The e2e pipeline integration test (`test_e2e_pipeline.js`) had drifted significantly from production code:

1. **Inline JobKorea parser** — a simplified reimplementation instead of importing from `scripts/post-process-jobkorea.js` (created in EXP-069). The inline version lacked salary normalization, proper city detection, and production field names.

2. **LinkedIn completely absent** — LinkedIn jobs in the pipeline simulation were parsed as bare `{ title, company }` objects despite `scripts/post-process-linkedin.js` existing since EXP-070.

3. **Matching algorithm outdated** — the e2e matching code predated 5 major matching improvements:
   - EXP-049: Framework-aware domain detection (15 framework→domain mappings)
   - EXP-052: Title skill inference (empty skills score 50 instead of 0)
   - EXP-064: Expanded similarity map (11 new detail-skill pairs)
   - EXP-063: Default culture score aligned to 50 (e2e had hardcoded 70)

4. **Dedup outdated** — missing EXP-067 Korean↔English company equivalents, so LinkedIn "Kakao" never matched Korean "카카오" in e2e tests.

The e2e test is the **gold standard integration test** — it should catch gaps between individual component tests. But it was testing a stale version of the pipeline.

## Solution

### 1. Production Parser Imports
- `parseJobKoreaCard` imported from `scripts/post-process-jobkorea.js` with lines-array adapter
- `parseLinkedInCard` imported from `scripts/post-process-linkedin.js`
- All 3 sources now use production parsers in the pipeline simulation

### 2. Matching Algorithm Synced
- Copied TIER1/TIER2/TIER3 similarity maps from `test_validated_matching.js`
- Added `PRIMARY_DOMAINS` with 24 entries (languages + frameworks)
- Added `detectPrimaryDomains()` and `hasDomainOverlap()` functions
- `computeSkillScore`: empty job skills → 50 (neutral) instead of 0
- Default culture score: 50 (aligned with EXP-063)

### 3. Dedup Synced
- Added `companyKoEn` map (10 Korean→English company equivalents)
- `companyToCanonical()` maps Korean names to English canonical form
- LinkedIn "Kakao" now correctly deduplicates with Wanted/JobKorea "카카오"

### 4. New Test Cases
- LinkedIn parsed field verification
- Cross-source Kakao↔카카오 dedup test
- Pipeline simulation uses production LinkedIn parser with skills/experience

## Test Results

| Category | Before | After |
|----------|--------|-------|
| E2E tests | 39 | 43 |
| Total tests | 703 | 707 |
| Regressions | 0 | 0 |

## Files Changed

- `test_e2e_pipeline.js` — rewrote parser imports, matching algorithm, dedup, pipeline simulation

## Impact

The e2e pipeline test now validates the actual production code path from scraping through matching to query. Previously it tested a simplified approximation that could pass while production code had bugs. The 4 new tests specifically cover integration gaps that existed between component tests.
