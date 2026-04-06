# EXP-141: Front-end Hyphenated Role Title Skill Inference

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis

English role titles with hyphens (Front-end Engineer, Front-End Developer) return empty skills from `inferSkills()` because ROLE_SKILL_MAP only has `frontend` (no hyphen), while the regex `new RegExp('frontend', 'i')` doesn't match `front-end`.

## Discovery

Live Wanted API scraping showed `[hourplace] Front-end Engineer` at 먼치팩토리 returning `skills: []` — a frontend job with zero skill extraction, meaning 0% on the 35% skill matching weight.

## Change

Added two entries to ROLE_SKILL_MAP in `scripts/skill-inference.js`:
- `'front-end': ['react', 'typescript', 'javascript']`
- `'front end': ['react', 'typescript', 'javascript']`

Note: `back-end` and `full-stack` already existed from EXP-133, only `front-end` was missing.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Front-end Engineer skills | `[]` | `['react','typescript','javascript']` |
| Front-End Developer skills | `[]` | `['react','typescript','javascript']` |
| front end engineer skills | `[]` | `['react','typescript','javascript']` |
| Live Wanted API zero-skill rate (12 jobs) | 2/12 | 1/12 |

13 new test cases covering hyphenated variants, casing variations, Korean bracket prefixes, and negative cases (End-to-End Testing should not match).

**Verdict:** keep — 0 regressions, live scraping improvement confirmed.
