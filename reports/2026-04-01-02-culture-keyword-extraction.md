# EXP-043: Culture Keyword Extraction from Job Listings

**Date:** 2026-04-01
**Skill:** job-scraping / job-matching
**Metric:** culture scoring accuracy
**Verdict:** ✅ KEEP

## Problem

The matching algorithm's culture component (15% of total score) was effectively dead weight:
- `calculateCultureScore()` returns a flat **70** when no culture keywords are provided
- The scraper never extracted culture keywords from job listings
- Every job got culture=70 regardless of actual company culture
- 15% of the matching score was pure noise

## Hypothesis

Adding culture keyword extraction (6 categories, Korean + English) from job listing text enables the culture scoring component to actually discriminate between jobs based on cultural fit.

## Changes

1. **Culture extraction function**: 6 categories (innovative, collaborative, fast_paced, structured, learning_focused, autonomous) with Korean and English regex patterns
2. **SKILL.md v3.9**: Added extraction code block and keyword reference table
3. **jobs.db**: Added `culture_keywords` TEXT column
4. **scraper-agent.md**: Added culture_keywords to field schema
5. **job-matching SKILL.md v3.1**: Updated culture keywords section with extraction source reference
6. **test_culture_extraction.js**: 10 extraction tests + 4 integration tests = 14 total

## Results

| Metric | Before | After |
|--------|--------|-------|
| Culture extraction tests | 0 | 14/14 (100%) |
| Culture scoring discrimination | None (all 70) | Matching=100, Mismatch=50, None=70 |
| culture_keywords DB column | ❌ | ✅ |
| All existing tests | PASS | PASS (0 regressions) |

## Impact

- Culture-rich jobs that match candidate preferences now score **100** (vs 70)
- Mismatched culture jobs score **50** (vs 70)
- The 15% culture weight now contributes real discrimination instead of flat noise
- Keywords extracted from Korean text work correctly (혁신적인, 협업, 자율적으로 etc.)

## Test Coverage

- KR-001~007: Korean listing text extraction
- EN-001~002: English listing text extraction
- NO-CULTURE: Empty culture for generic listings
- CULTURE-SCORE-01~04: Score integration with candidate preferences
