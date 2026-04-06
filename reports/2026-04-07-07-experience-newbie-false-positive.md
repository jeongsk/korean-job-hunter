# EXP-154: Experience Extraction "신입사원" False Positive Fix

**Date:** 2026-04-07
**Skill:** job-scraping
**Metric:** experience_extraction_accuracy

## Hypothesis

Wanted JD descriptions frequently contain "신입사원 OJT" (new employee onboarding program) in their benefits section. The `extractExperienceRange()` function's Priority 5 regex `/자격요건[^]*신입/` matched "신입" inside "신입사원", causing senior and mid-level positions to incorrectly get `experience="신입"`.

## Root Cause

The regex `/자격요건[^]*신입/` uses `[^]*` (matches anything including newlines) to find "신입" after the "자격요건" section. But many Wanted JDs have a benefits section after the qualification section that mentions "신입사원 OJT, 적응 프로그램 지원" — this text is after "자격요건" and contains "신입", triggering the match.

## Change

1. Added negative lookahead `(?!사원)` to the "신입" regex in `extractExperienceRange()`:
   - Before: `/자격요건[^]*신입/`
   - After: `/자격요건[^]*신입(?!사원)/`

2. Added new Priority 5 for "신입/경력" patterns → returns "무관" (accepts all experience levels):
   - Handles: `신입/경력`, `신입 · 경력`, `신입,경력`

3. 10 new test cases in `test_experience_newbie_false_positive.js`

## Results

| Metric | Before | After |
|--------|--------|-------|
| 미리캔버스 시니어 experience | 신입 (wrong) | 경력 (correct) |
| 미리캔버스 백엔드 experience | 신입 (wrong) | 경력 (correct) |
| 신입사원 false positive | Yes | Fixed |
| 신입/경력 handling | Not supported | → 무관 |
| Total tests | 1843 | 1853 (+10) |
| Regressions | — | 0 |

## Live Validation

Wanted API "프론트엔드" search with `--details`:
- `[미리캔버스] 시니어 프론트엔드 개발자`: experience changed from "신입" → "경력"
- `[미리캔버스] 프론트엔드 개발자 (웹&에디터)`: experience changed from "신입" → "경력"

## Impact

The `experience` field feeds into `deriveCareerStage()` which determines the 15% career_stage matching weight. Senior positions incorrectly tagged as "신입" would get `career_stage=entry`, causing a -15% penalty on the career_stage component for candidates who should be a good match. This directly impacts matching accuracy for jobs from companies with new employee onboarding programs (common in Korean companies).

The "신입/경력 → 무관" addition prevents another class of errors where jobs accepting all experience levels were tagged as entry-level only.
