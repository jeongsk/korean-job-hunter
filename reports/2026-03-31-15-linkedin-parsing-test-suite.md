# EXP-041: LinkedIn Parsing Test Suite + Location Normalization

**Date:** 2026-03-31T15:04:00Z  
**Skill:** job-scraping  
**Component:** LinkedIn extraction  

## Hypothesis
LinkedIn scraping had zero dedicated parsing tests and no post-processing logic for location normalization. Adding a test suite would reveal parsing bugs in location, experience, and work_type extraction from LinkedIn card data.

## Changes
1. Created `test_linkedin_parsing.js` with 15 test cases covering:
   - Basic title/company extraction
   - Korean/English company names
   - Remote/hybrid work type detection from title and location
   - Experience extraction: ranges (3~5년), 신입, 시니어, 경력 N년
   - Salary extraction from title
   - Tracking redirect link normalization
   - Empty field handling
   - Korean location normalization (10 English→Korean city mappings)

2. Fixed location normalization logic:
   - Proper country suffix stripping (`South Korea`, `대한민국`)
   - City-by-city mapping instead of fragile replace chains
   - Gyeonggi-do → 경기도 conversion
   - Comma-to-space cleanup

3. Updated SKILL.md v3.7 with LinkedIn post-processing section

## Results

| Metric | Before | After |
|--------|--------|-------|
| LinkedIn test cases | 0 | 15/15 (100%) |
| Location bugs | 4 failures | 0 |
| SKILL.md version | v3.6 | v3.7 |
| All other tests | PASS | PASS (0 regressions) |

## Bugs Found & Fixed
1. **LN-001**: Suwon+Gyeonggi-do produced `수원 Gyeonggi-do` — fixed with proper city mapping + Gyeonggi conversion
2. **LN-002**: Seoul trailing space — fixed by trimming after normalization
3. **LN-012**: Busan not normalized — fixed by adding to city map
4. **LN-014**: Pangyo not normalized — fixed by adding to city map

## Verdict: KEEP ✅
