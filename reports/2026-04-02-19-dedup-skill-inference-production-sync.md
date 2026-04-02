# EXP-080: Production Dedup & Skill Inference Sync

**Date:** 2026-04-02  
**Skill:** job-scraping + job-matching  
**Status:** ✅ Kept (all 870 tests passing)

## Problem

Two production pipeline gaps discovered:

1. **Dedup script missing Korean↔English company equivalents**: EXP-067 added 25 company equivalents (카카오↔Kakao, 네이버↔Naver, etc.) to `test_cross_source_dedup.js`, but the production `scripts/dedup-jobs.js` never got them. Real cross-source dedup between LinkedIn (English company names) and Korean sources was broken.

2. **Wanted & JobKorea post-processors not using shared skill-inference**: EXP-077 created `scripts/skill-inference.js` as a shared module, but only `post-process-linkedin.js` was wired to use it. Wanted and JobKorea post-processors output empty `skills` fields, meaning the skills DB column (added in EXP-077) was never populated for those sources.

## Changes

### scripts/dedup-jobs.js
- Added `companyKoEnMap` with 25 Korean↔English company equivalents
- Added `companyToCanonical()` function for canonical company name matching
- Updated `companyMatch()` to compare canonical forms

### scripts/post-process-wanted.js
- Imported shared `skill-inference` module
- Added `inferSkills(r.title)` call to populate skills from job title

### scripts/post-process-jobkorea.js
- Imported shared `skill-inference` module
- Added `inferSkills(title)` call to populate skills from job title

### test_dedup_production_sync.js (NEW)
- 6 tests verifying test↔production code synchronization
- Checks companyKoEnMap presence, canonical matching, skill-inference usage across all post-processors

## Results

| Metric | Before | After |
|--------|--------|-------|
| Dedup ko↔en equivalents (production) | 0 | 25 |
| Post-processors using skill-inference | 1/3 | 3/3 |
| Total tests | 864 | 870 |
| Regressions | — | 0 |
