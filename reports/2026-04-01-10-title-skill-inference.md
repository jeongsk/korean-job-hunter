# EXP-052: Title-Based Skill Inference

**Date:** 2026-04-01
**Skill:** job-matching
**Status:** ✅ Keep

## Problem

When `job.skills` is empty (common from LinkedIn/partial scrapes), the skill score defaults to 50 — a neutral coin flip. This means:
- A "React/TypeScript 프론트엔드" job with no skills extracted scores the same as a "Java/Spring 백엔드" job with no skills
- Discrimination between relevant and irrelevant jobs is lost for partially-scraped data
- The domain alignment penalty can't activate because there are no skills to detect domains from

## Hypothesis

Extracting explicit technology keywords from job titles (when skills list is empty or sparse) restores correct matching discrimination without affecting jobs that already have explicit skills.

## Change

- Added `inferSkillsFromTitle()` with 30+ technology patterns (English + Korean equivalents)
- Only extracts explicit tech mentions — does NOT infer from role names ("프론트엔드" ≠ React)
- Supplements explicit skills when `job.skills.length < 2`
- Updated `skills/job-matching/SKILL.md` v3.3 with title inference documentation
- Updated `agents/matcher-agent.md` v4.2 with title inference section

## Results

```
Title Skill Extraction: 20/20 patterns correct
Matching Improvement: 4/4 tests passed
  - React/TypeScript title → score 84 (was 50)
  - Java/Spring title → score 2 (was 50)
  - Gap: 82 points (was 0)
Regression Tests: 6/6 passed
  - Explicit skills jobs unchanged
  - Sparse skills (1) supplemented from title
  - No title + no skills still neutral at 50
Domain Alignment: 2/2 passed
  - Python/Django title correctly penalized for JS candidate

Total: 33/33 new tests, 0 regressions
```

## Key Impact

| Scenario | Before | After |
|----------|--------|-------|
| "React/TypeScript" title, empty skills | 50 | 84 |
| "Java/Spring" title, empty skills | 50 | 2 |
| Discrimination gap | 0 pts | 82 pts |
| Explicit skills job | unchanged | unchanged |

## Test File

`test_title_skill_inference.js` — 33 test cases
