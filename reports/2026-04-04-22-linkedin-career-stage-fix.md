# EXP-108: LinkedIn Lead/Principal/Staff Career Stage Fix

**Date:** 2026-04-04
**Skill:** job-scraping (post-process-linkedin.js)
**Metric:** career_stage accuracy for senior-adjacent titles

## Hypothesis

LinkedIn's seniority extraction mapped `lead`, `principal`, and `staff` titles all to level `senior`, causing:
1. Career stage for lead/principal/staff positions was `senior` instead of `lead`
2. The 15% career_stage matching component couldn't distinguish between senior and lead-level positions from LinkedIn
3. Korean NLP queries for "리드 포지션" wouldn't find LinkedIn-sourced lead/principal/staff jobs
4. Tracker-agent.md documented "리드 → j.career_stage = 'lead'" but LinkedIn post-processor never produced `lead`

## Root Cause

The `SENIORITY_PATTERNS` regex mapped `(senior|lead|principal|staff|sr\.?)` to a single `senior` level. LinkedIn's `deriveCareerStage` then mapped `senior` → `senior` career stage. The shared `deriveCareerStage` in `skill-inference.js` (used by Wanted/JobKorea) correctly produces `lead` for 12+ years, but LinkedIn's title-based derivation had no path to `lead`.

## Change

1. Split the senior regex into two patterns (ordered by precedence):
   - `(principal|staff|tech lead)` → level `lead`, minYears 10
   - `(lead)` → level `lead`, minYears 8
   - `(senior|sr.?)` → level `senior`, minYears 5
2. Updated `deriveCareerStage` to handle `lead` level → `lead` career_stage
3. Updated test expectations for EXP-LI-003 and EXP-LI-008
4. Added 8 new test cases covering staff, tech lead, sr. abbreviation, "leading" (negative), and career_stage via parseLinkedInCard
5. Updated scraper-agent.md to document correct mapping

## Results

| Metric | Before | After |
|--------|--------|-------|
| "Lead Developer" career_stage | `senior` | `lead` |
| "Staff Engineer" career_stage | `senior` | `lead` |
| "Principal Engineer" career_stage | `senior` | `lead` |
| "Senior Developer" career_stage | `senior` | `senior` |
| "Leading Product Designer" career_stage | `senior` | `null` (correct — false positive) |
| Total tests | 1271 | 1279 |
| Regressions | 0 | 0 |

## Impact

LinkedIn-sourced lead, principal, and staff positions now correctly get `career_stage: 'lead'`. This means:
- Matching algorithm's 15% career_stage component properly distinguishes senior from lead positions
- Korean NLP queries for "리드 포지션" will find LinkedIn lead/principal/staff jobs
- "시니어 포지션" queries won't incorrectly include lead/principal/staff positions
- The false positive "Leading Product Designer" → `senior` is also fixed → `null`
