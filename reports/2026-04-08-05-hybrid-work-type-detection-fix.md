# EXP-164: Hybrid Work Type Detection Priority Fix

**Date:** 2026-04-08 10:04 KST
**Skill:** job-scraping
**Metric:** work_type_classification_accuracy

## Hypothesis

LinkedIn and JobKorea `detectWorkType` functions checked full-remote patterns (재택근무, 원격근무) BEFORE hybrid patterns (격주 재택, 부분 재택, 선택적 재택). Since hybrid patterns contain 재택 as a substring, "격주 재택근무" matched 재택근무 first → returned 'remote' instead of 'hybrid'. The test file's inline Wanted/JobKorea detectors had the same reversed order.

Wanted post-processor and API scraper already had correct hybrid-first ordering. LinkedIn and JobKorea were out of sync.

## Changes

1. **post-process-linkedin.js**: Swapped hybrid check before remote check in `detectWorkType()`
2. **post-process-jobkorea.js**: Swapped hybrid check before remote check in work_type detection
3. **test_work_type_hybrid.js**: Fixed inline `detectWorkTypeWanted` and `detectWorkTypeJobKorea` to match production order

## Results

| Metric | Before | After |
|---|---|---|
| Tests passing | 265/277 | 277/277 ✅ |
| Hybrid detection failures | 12 | 0 ✅ |
| LinkedIn hybrid classification | remote (wrong) | hybrid (correct) |
| JobKorea hybrid classification | remote (wrong) | hybrid (correct) |

- **Regressions:** 0

## Impact

Patterns like 격주 재택근무, 부분 재택, 선택적 재택, 주 2일 재택 were classified as 'remote' for LinkedIn and JobKorea sources. This affected the 15% work_type matching weight and NLP work_type queries (재택, 원격, 하이브리드). Hybrid jobs appeared as remote in search results, misleading users about actual workplace flexibility.
