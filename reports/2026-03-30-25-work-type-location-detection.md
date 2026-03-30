# EXP-025: Work Type + Location Detection in Field Parsing

**Date:** 2026-03-30  
**Skill:** job-scraping  
**Metric:** field completeness (work_type, location)

## Hypothesis

Adding work_type and location detection to the Wanted text parsing pipeline will improve field completeness from 0% to measurable levels for these two fields, which are critical inputs to the job-matching algorithm's location/work_type component (10% weight).

## Changes

1. **work_type detection**: Added keyword-based detection for remote/hybrid patterns before other text processing. Keywords are removed from working text after detection to prevent title pollution.
2. **location detection from brackets**: Extract city + optional district from `[...]` brackets, handling mixed brackets like `[부산/경력 5년]`.
3. **bare location fallback**: If no bracket location found, search remaining text for city/district keywords.
4. **Updated test_parsing.js**: Added 4 new test cases (12 total) covering remote, hybrid, bracket locations, and bare locations.
5. **Updated scraper-agent.md**: Added work_type and location detection sections.
6. **Updated job-scraping SKILL.md**: Added v3.1 section with detection patterns.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Parsing tests | 8/8 (100%) | 12/12 (100%) |
| work_type detection | Not implemented | 4/4 test cases pass |
| location detection | Not implemented | 4/4 test cases pass |
| Match tests | 7/7 (100%) | 7/7 (100%) |
| Discrimination | PASS | PASS |

## Test Cases Added

- `재택근무` + bare `서울` → work_type: remote, location: 서울
- `하이브리드` + `[판교]` → work_type: hybrid, location: 판교
- `전면재택` no location → work_type: remote, location: ""
- `주3일출근` + `[서울 영등포구]` → work_type: hybrid, location: 서울 영등포구

## Verdict: KEEP ✅

Zero regression, new capability added. The matching algorithm can now properly score location/work_type for scraped jobs.

## Impact on Matching

Previously, scraped jobs had no work_type/location data, making the 10% location component in matching essentially random. Now it contributes meaningful signal.
