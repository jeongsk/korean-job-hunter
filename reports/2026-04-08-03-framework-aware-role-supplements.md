# EXP-162: Framework-Aware Role Supplements

**Date:** 2026-04-08 04:04 KST
**Skill:** job-scraping + job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis

ROLE_SKILL_MAP always-supplement (EXP-130) added role-based skills unconditionally. When a specific framework was already detected (Angular, Vue, Nuxt, Svelte, Go, Rust), the role supplement added conflicting defaults:
- Angular 프론트엔드 → angular + **react** + typescript + javascript ❌
- Go 백엔드 → go + **node.js** + **python** + **java** ❌
- Flutter 모바일 → flutter + **react native** ❌

These false skills dilute matching accuracy — a Go backend job shouldn't match as strongly with a React/Node.js developer.

## Change

Added `FRAMEWORK_CONFLICTS` conflict detection before role supplement injection:

| Conflict Set | Detected Skill | Blocked Skills |
|---|---|---|
| Frontend | angular, vue, nuxt, svelte, swiftui | react |
| Mobile | flutter, react native, swiftui | react native, flutter |
| Backend | go, rust, c#, ruby, php | node.js, python, java |

When any detector skill is found in already-extracted skills, the corresponding blocked skills are skipped from ALL role supplements.

## Results

| Case | Before | After |
|---|---|---|
| Angular 프론트엔드 | angular, react, ts, js | angular, ts, js ✅ |
| Nuxt 프론트엔드 | nuxt, react, ts, js | nuxt, ts, js ✅ |
| Go 백엔드 | go, node.js, python, java | go ✅ |
| Flutter 모바일 | flutter, react native | flutter ✅ |
| 프론트엔드 (generic) | react, ts, js | react, ts, js ✅ (unchanged) |
| 백엔드 (generic) | node.js, python, java | node.js, python, java ✅ (unchanged) |
| React 프론트엔드 | react, ts, js | react, ts, js ✅ (no conflict) |

- **New tests:** 16
- **Total tests:** 182 (all passing)
- **Regressions:** 0

## Files Changed

- `scripts/skill-inference.js` — FRAMEWORK_CONFLICTS detection + blocked skills filter
- `test_framework_conflict_supplement.js` — 16 new test cases
- `test_english_role_skills.js` — Updated "Backend Engineer (Go)" expectation
- `agents/scraper-agent.md` — Updated skill-inference description

## Impact

Skill profiles for framework-specific postings are now more accurate. Matching algorithm (35% skill weight) no longer gives false credit for conflicting ecosystem skills. This directly improves discrimination for jobs that specify their technology stack in the title.
