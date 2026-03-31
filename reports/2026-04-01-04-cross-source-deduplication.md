# EXP-045: Cross-Source Deduplication

**Date**: 2026-04-01
**Skill**: job-scraping
**Focus**: Cross-source duplicate detection

## Hypothesis

Same job posted on Wanted, JobKorea, and LinkedIn has different URLs, causing duplicate entries in the database. Adding fuzzy title+company matching with Korean↔English title equivalents will detect cross-source duplicates that URL-based dedup misses.

## Changes

1. **Created `test_cross_source_dedup.js`** — 13 test cases covering:
   - Exact same title+company across sources
   - Senior prefix variations ("프론트엔드 개발자" vs "시니어 프론트엔드 개발자")
   - Company prefix normalization ("네이버" vs "㈜네이버")
   - Korean↔English title bridging ("프론트엔드 개발자" ↔ "Frontend Developer")
   - Company suffix normalization ("Google" vs "Google Korea")
   - Three-source same job detection
   - False positive prevention: different jobs at same company, same title at different companies
   - Mixed batches with partial duplicates

2. **Algorithm**:
   - **Company match**: Normalize (strip prefixes, case-insensitive), exact or containment match
   - **Title similarity**: Token-based Jaccard with Korean↔English equivalents map (프론트엔드↔frontend, 백엔드↔backend, 개발자↔developer, etc.)
   - **Threshold**: Same company + title similarity ≥ 0.6 → duplicate

3. **Updated SKILL.md v4.0** with dedup section including algorithm description, Korean↔English map, and SQL for finding duplicates
4. **Updated scraper-agent.md** to reference cross-source dedup

## Results

| Metric | Before | After |
|--------|--------|-------|
| Cross-source dedup tests | 0 | 13/13 (100%) |
| Korean↔English equivalents | 0 | 12 mappings |
| All existing tests | PASS | PASS (0 regressions) |

## Key test scenarios
- ✅ Same title+company across 2-3 sources → detected as duplicate
- ✅ "React Frontend Developer" ↔ "프론트엔드 개발자 (React)" → detected (Korean↔English bridge)
- ✅ Different jobs at same company → NOT flagged (title Jaccard < 0.6)
- ✅ Same title at different company → NOT flagged (company mismatch)
- ✅ Company prefix/suffix variations normalized correctly

## Verdict: KEEP
