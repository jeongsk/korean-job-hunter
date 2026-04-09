# EXP-173: Location Proximity Clusters for Korean Districts

**Date:** 2026-04-09
**Skill:** job-matching
**Metric:** location_scoring_accuracy

## Hypothesis

Location matching only checked substring inclusion — a candidate preferring '강남' got zero bonus for a job in '역삼' despite them being adjacent Gangnam district stops. Korean tech hubs form natural clusters (Gangnam belt, Pangyo hub, CBD) where nearby locations should get partial credit.

## Changes

1. **LOCATION_CLUSTERS**: 10 geographic clusters covering Seoul, Gyeonggi, and major cities with ~90 district entries
2. **LOCATION_TO_CLUSTER**: Reverse mapping for O(1) cluster lookup
3. **locationProximity()**: Returns 15 (exact), 10 (same cluster), 5 (adjacent cluster), or 0 (no proximity)
4. **Adjacent cluster pairs**: gangnam↔pangyo, gangnam↔seongsu, cbd↔guro, hongdae↔seongsu, downtown↔hongdae, downtown↔cbd, gangnam↔suwon, pangyo↔suwon
5. Updated SKILL.md v3.16 and matcher-agent.md

## Results

| Metric | Before | After |
|--------|--------|-------|
| Location match | Exact substring only | Proximity clusters with 3 tiers |
| 강남→역삼 bonus | 0 | 10 |
| 강남→성수 bonus | 0 | 5 |
| 강남→부산 bonus | 0 | 0 (correct) |
| Total test assertions | 134 | 157 |
| Regressions | 0 | 0 |

## Examples

- `강남` pref → `역삼` job: +10 (same gangnam cluster)
- `판교` pref → `분당` job: +10 (same pangyo cluster)
- `강남` pref → `성수` job: +5 (adjacent cluster)
- `강남` pref → `부산` job: +0 (no proximity)
- `서울` pref → `서울 강남구` job: +15 (exact match, unchanged)
