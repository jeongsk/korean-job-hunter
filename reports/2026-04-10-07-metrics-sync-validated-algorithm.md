# EXP-181: Sync Autoresearch Metrics with Validated Algorithm v3.16

**Date:** 2026-04-10
**Skill:** job-matching (measurement)
**Metric:** baseline measurement accuracy

## Hypothesis

The autoresearch-metrics.js baseline measurement tool used stale weights (50/15/10/15/10) from pre-EXP-017 and was missing 6 validated algorithm features: domain alignment (EXP-024), coverage gate (EXP-168), career stage scoring (EXP-091), culture scoring (EXP-063), location proximity clusters (EXP-173), and expanded similarity map. This meant 40% of the validated algorithm (career_stage 15% + culture 15% + location improvements) was completely dormant in baseline measurements, making discrimination metrics unreliable.

## Changes

1. **Updated weights** from 50/15/10/15/10 → 35/25/15/15/10 (skill/experience/culture/career_stage/location_work)
2. **Added domain alignment penalty** (40% when job primary domain ≠ candidate primary domain)
3. **Added coverage gate** (0.75 dampening when skill≥40 but coverage<60%)
4. **Added career stage scoring** (15% weight, graduated scoring based on stage thresholds)
5. **Added culture scoring** (15% weight, keyword overlap between job and candidate)
6. **Added location proximity clusters** (10 Seoul-area clusters with adjacent cluster scoring)
7. **Expanded similarity map** from 24 entries to 80+ covering all validated TIER1/TIER2/TIER3 pairs
8. **Enriched all 10 test cases** with career_stage, culture_keywords, and salary data
9. **Updated test expectations** for TC-006 and TC-010 to reflect domain penalty impact

## Results

| Metric | Before (stale) | After (synced) | Delta |
|--------|----------------|-----------------|-------|
| Discrimination | 74.53 | 78.53 | **+4.00** |
| Spread | 34.37 | 37.07 | **+2.70** |
| Positive Avg | 79.2 | 84.2 | +5.0 |
| Negative Avg | 4.67 | 5.67 | +1.0 |
| Borderline Avg | 36.5 | 22.5 | **-14.0** |
| False Positive | 0% | 0% | — |
| Coverage | 100% | 100% | — |

Key improvement: borderline_avg dropped from 36.5 to 22.5 — much better separation from positives (84.2 vs 22.5 = 61.7pt gap vs old 42.7pt gap).

TC-006 (Java vs Node.js, domain mismatch) correctly dropped to 14 (from 19 with old algorithm).
TC-010 (Python/FastAPI vs Node.js, domain mismatch) correctly dropped to 31 (from 54 with old algorithm).

## Impact

Baseline measurements now accurately reflect the validated matching algorithm. This means:
- Future experiments can measure real improvements against accurate baselines
- Domain alignment correctly differentiates cross-domain borderline cases
- Career stage and culture components provide additional discrimination vectors
- The 14-point drop in borderline_avg shows the algorithm is more conservative about borderline cases, which is correct behavior — fewer false "might be good" matches

All 347 tests pass with 0 regressions.
