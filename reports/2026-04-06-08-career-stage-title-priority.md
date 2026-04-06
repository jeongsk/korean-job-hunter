# EXP-140: Career Stage Title Priority in Detail Enrichment

**Date:** 2026-04-06 11:04 KST
**Skill:** job-scraping + job-matching
**Metric:** career_stage_accuracy

## Hypothesis

When `--details` flag is used, the detail enrichment code re-derives `career_stage` from experience text, which overrides the correct title-based career_stage. This causes `[미리캔버스] 시니어 프론트엔드 개발자` to get `career_stage: "entry"` instead of `"senior"` because the Wanted API returns `experience: "신입"` for this position.

## Bug

In `scrape-wanted-api.js` detail enrichment loop:

```js
// Old code (broken):
if (expRange) {
  job.experience = expRange;
  job.career_stage = deriveCareerStage(expRange);  // overrides title-based "senior"
}
```

Wanted API frequently returns incorrect experience data. `[미리캔버스] 시니어 프론트엔드 개발자` has `is_newbie=true` from API (experience="신입"), but the title clearly says "시니어". The detail enrichment blindly overrides the correct title-derived career_stage.

Live data confirmed:
- `[미리캔버스] 시니어 프론트엔드 개발자` → `career_stage: "entry"` (should be `senior`)
- API `experience: "신입"` overrides title "시니어"

## Change

Updated detail enrichment to prefer title-based career_stage:

```js
// New code (fixed):
const titleStage = deriveCareerStageFromTitle(job.title);
if (titleStage) {
  job.career_stage = titleStage;  // title wins over API experience
} else if (expRange) {
  job.career_stage = deriveCareerStage(expRange);
} else {
  const stage = deriveCareerStage(job.experience + ' ' + detail.description);
  if (stage && stage !== 'mid') job.career_stage = stage;
}
```

## Results

| Metric | Before | After |
|--------|--------|-------|
| `[미리캔버스] 시니어 프론트엔드 개발자` career_stage | `entry` ❌ | `senior` ✅ |
| New test cases | 0 | 21 |
| Regressions | 0 | 0 |

## Test Coverage

21 new tests covering:
- deriveCareerStageFromTitle correctness (Korean + English patterns)
- deriveCareerStage correctness (bare 경력, 신입, N년 이상)
- Priority logic: title-based stage wins over experience-based
- Edge cases: CTO, Staff, Leading false positive

## Why This Matters

The 15% career_stage matching weight was systematically wrong for detail-enriched senior positions. A senior React developer applying to `[미리캔버스] 시니어 프론트엔드 개발자` would get a -55pt career_stage penalty (entry vs senior expectation) despite the title clearly indicating senior level.

## Verdict: KEEP ✅
