# EXP-155: Calendar Year False Positive in deriveCareerStage

**Date:** 2026-04-07
**Skill:** job-scraping+job-matching
**Metric:** career_stage_accuracy

## Hypothesis

`deriveCareerStage()` matched calendar years in Korean text (e.g., "21년도부터" meaning "since 2021") as experience years, causing incorrect career_stage=lead for regular mid-level positions. The scraper fallback also passed entire job descriptions to deriveCareerStage, picking up unrelated year mentions.

## Root Cause

Two issues:

1. **Regex false positive:** The single-match regex `/(\d+)\s*년/` matched "21년" inside "21년도" (year 2021). Similarly "19년도", "24년도" etc. The regex had no protection against the Korean calendar-year suffix 도.

2. **Overly broad fallback:** The `--details` scraper fallback passed the entire job description to deriveCareerStage when neither title-based nor experience-range detection worked. Company backgrounds often mention "21년도부터 매년 60% 성장" or "24년에 시리즈 B 투자" — these calendar years were interpreted as experience requirements.

## Change

1. Added negative lookahead `(?![가-힣])` to all `년` regexes in both `deriveCareerStage()` and `deriveCareerStageFromTitle()`:
   - `singleMatch`: `/(\d+)\s*년/` → `/(\d+)\s*년(?![가-힣])/`
   - `rangeMatch`: same protection
   - Title year ranges and newbie ranges: same protection

2. Constrained the scraper fallback to only pass the 자격요건 (qualification) section of the description instead of the full text:
   - Before: `deriveCareerStage(job.experience + ' ' + detail.description)`
   - After: `deriveCareerStage(job.experience + ' ' + qualSection)` where qualSection is extracted via `/자격요건[^]*?(?=우대사항|혜택|$)/`

3. 18 new test cases in `test_calendar_year_false_positive.js`

## Results

| Metric | Before | After |
|--------|--------|-------|
| "21년도" → career_stage | lead (wrong) | null (correct) |
| "19년도" → career_stage | lead (wrong) | null (correct) |
| 미리캔버스 백엔드 career_stage | lead (wrong) | mid (correct) |
| "5년 이상" | mid | mid (unchanged) |
| "3년~5년" | junior | junior (unchanged) |
| Total tests | 1843 | 1861 (+18) |
| Regressions | — | 0 |

## Live Validation

Wanted API "백엔드" search:
- `[미리캔버스] 백엔드 개발자`: career_stage changed from lead → mid (title has no seniority indicator, experience is bare "경력")
- `[미리캔버스] 시니어 백엔드 개발자`: career_stage remains senior (title-based detection, correct)

## Impact

The 15% career_stage matching weight was being incorrectly set to "lead" for regular mid-level positions at companies that mention calendar years in their company background. For example, 미리디's description mentions "21년도부터 매년 60% 성장" — this caused their regular 백엔드 개발자 posting to get career_stage=lead, penalizing mid-level candidates by 15% on the career_stage component.
