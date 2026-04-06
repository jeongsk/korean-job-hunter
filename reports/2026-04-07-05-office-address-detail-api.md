# EXP-152: Office Address Extraction from Wanted Detail API

**Date:** 2026-04-07
**Skill:** job-scraping
**Metric:** office_address_population

## Hypothesis

The `office_address` column existed in the jobs DB since EXP-110 and was referenced in dedup field scoring (EXP-109) and the scraper-agent INSERT template, but no scraper ever populated it. The Wanted detail API returns `address.full_location` with full street addresses and `address.geo_location.location` with lat/lng coordinates — valuable data for commute time estimation that was being silently discarded.

## Change

1. Added `office_address`, `latitude`, `longitude` extraction from `data.address` in `fetchDetail()`
2. Added enrichment logic to populate job fields from detail API response
3. Added `office_address`, `latitude`, `longitude` to `parsePosition()` output defaults
4. Updated `scraper-agent.md` with new field documentation

## Results

| Metric | Before | After |
|--------|--------|-------|
| office_address populated | Never (always '') | 12/12 live jobs (100%) |
| lat/lng available | Never | 12/12 live jobs (100%) |
| new tests | 0 | 10 |
| regressions | — | 0 |

Live validation against 12 Wanted 프론트엔드 jobs:
- All 12 returned full Korean street addresses (e.g., "디지털로31길 12, 8층, 13층, 14층 (구로동, 태평양물산)")
- All 12 returned lat/lng coordinates enabling future commute time calculation
- Addresses include 구, 동, building names, and floor numbers

## Impact

- **Commute calculation:** lat/lng enables straight-line distance and future API-based commute time estimation
- **Dedup field scoring:** office_address now contributes +1 to fieldScore instead of being always 0
- **Location matching:** full addresses enable finer-grained location filtering beyond city-level (e.g., 강남 vs 구로)
- **10 test cases** covering extraction, enrichment, edge cases, and real address formats
