# EXP-161: Skill Merge — Title Inference No Longer Overwrites Description Skills

**Date:** 2026-04-08
**Skill:** job-scraping + job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis
`post-process-wanted.js` unconditionally overwrote `r.skills` with title-only inferred skills (`inferSkills(r.title)`). For jobs fetched with `--details`, the description-inferred skills (NestJS, PostgreSQL, Kafka, etc.) were replaced by generic role-mapped skills (node.js, python, java) from the title "백엔드 개발자".

## Change
Changed skill inference in `parseWantedJob()` from overwrite to merge:
- Before: `if (inferred.length > 0) r.skills = inferred.join(', ')`
- After: Merge existing skills with title-inferred skills using Set dedup

Also ensures the early-return path (structured jobs with clean title/company) continues to preserve description-inferred skills unchanged.

## Baseline
- parseWantedJob with existing skills: overwritten with title-only generic skills
- Detail-fetched backend jobs: only "node.js, python, java" regardless of actual description content
- Total tests: 1891 pass, 0 fail

## Result
- Detail-fetched jobs now preserve description-inferred skills AND add title-inferred ones
- Early-return path unchanged (already preserved skills)
- All 1891 tests passing, 0 regressions

## Impact
For backend "백엔드 개발자" jobs with --details:
- Before: skills = "node.js, python, java" (generic, from title role map)
- After: skills = "nestjs, postgresql, kafka, docker, kubernetes, grpc, redis, node.js, python, java" (merged)

This directly improves job-matching accuracy since the matching algorithm now has the actual technology stack to match against, not just generic role defaults.
