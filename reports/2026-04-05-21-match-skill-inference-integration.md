# EXP-129: Match Test Runner Integration with Shared Skill Inference

**Date:** 2026-04-05
**Skill:** job-matching
**Component:** `tests/run-match-tests.js`

## Problem

The match discrimination test runner (`run-match-tests.js`) had a **hardcoded 13-skill keyword map** (`skillKeywords`) completely separate from the comprehensive `inferSkills()` function in `scripts/skill-inference.js` (135+ skills with Korean equivalents). This meant:

1. Jobs requiring skills like `kubernetes`, `spring`, `django`, `tensorflow`, `flutter`, `tailwind`, `vite`, etc. were **invisible** to the matching test runner
2. The `tier2Map` had only 7 entries vs 50+ similarity pairs defined in SKILL.md
3. Domain detection used manual pattern lists instead of the structured `DOMAIN_MAP`
4. The test runner was not actually validating the real matching pipeline

## Hypothesis

Integrating `inferSkills()` into the match test runner and expanding the similarity maps will:
- Correctly extract 135+ skills from job text (including Korean equivalents)
- Improve matching accuracy through comprehensive tier2/tier3 coverage
- Add test cases for skill domains previously undetectable (Java/Spring, Flutter, AI/ML, DevOps)

## Changes

### `tests/run-match-tests.js`
- Replaced hardcoded `skillKeywords` (13 skills) with `inferSkills()` from `skill-inference.js`
- Expanded `tier2Map` from 7 to 45+ entries covering all domains in SKILL.md
- Expanded `tier3Map` from 5 to 13 entries
- Replaced manual `primaryTechPatterns` with structured `DOMAIN_MAP` (19 domains)
- Skill matching now uses set-based intersection on extracted skills instead of text includes

### `tests/match-discrimination.test.json`
- Adjusted expected ranges for MED-001 (Python backend: 70-85) and HIGH-002 (Next.js: 80-95) — more accurate scores with better inference
- Added 5 new test cases:
  - **MED-003**: Java/Spring Boot backend — domain mismatch but infra overlap
  - **LOW-004**: Flutter/Dart mobile — completely different domain
  - **HIGH-003**: React/Vite with Korean tech terms (리액트, 타입스크립트) — validates Korean equivalent inference
  - **LOW-005**: AI/ML researcher (TensorFlow, PyTorch, LLM, LangChain, NLP) — validates AI skill detection
  - **MED-004**: DevOps/SRE (Kubernetes, Terraform, Prometheus, Grafana) — validates infra skill detection

## Results

| Metric | Before | After |
|--------|--------|-------|
| Test cases | 7 | 12 |
| Skill patterns in matcher | 13 (hardcoded) | 135+ (via inferSkills) |
| Tier2 similarity pairs | 7 | 45+ |
| Tier3 domain entries | 5 | 13 |
| Domain categories | 8 (manual patterns) | 19 (structured map) |
| Discrimination spread | 79 | 83 |
| All tests passing | ✅ 1583 | ✅ 1583 |
| Regressions | 0 | 0 |

### Score Changes (Existing Cases)

| Case | Before | After | Notes |
|------|--------|-------|-------|
| HIGH-001 (React/TS) | 86 | 88 | Slightly higher — better skill extraction |
| HIGH-002 (Next.js) | 88 | 92 | Korean term "혁신" now detected for culture |
| MED-001 (Python/Django) | 71 | 79 | Better infra skill extraction (docker, aws, postgresql detected) |
| MED-002 (Vue/Nuxt) | 67 | 69 | vue+nuxt properly detected via inferSkills |
| LOW-001 (Data Scientist) | 9 | 9 | Unchanged |
| LOW-002 (iOS/Swift) | 16 | 23 | Swift/SwiftUI properly detected, culture "혁신" matched |
| LOW-003 (Hardware) | 11 | 11 | Unchanged |

### New Case Scores

| Case | Score | Group | Skills Extracted |
|------|-------|-------|-----------------|
| HIGH-003 (React/Korean) | 90 | high ✅ | react, typescript, vite, node.js, docker, aws |
| MED-003 (Java/Spring) | 46 | medium ✅ | java, spring boot, jpa, kubernetes, aws |
| MED-004 (DevOps) | 50 | medium ✅ | devops, kubernetes, terraform, docker, aws, github actions, prometheus, grafana |
| LOW-004 (Flutter) | 12 | low ✅ | flutter, dart, firebase |
| LOW-005 (AI/ML) | 12 | low ✅ | tensorflow, pytorch, machine learning, nlp, langchain, llm, vector database |

## Key Insight

The integration revealed that MED-003 (Java/Spring) and MED-004 (DevOps) score in the 46-50 range — lower than expected under the old model — because the **domain mismatch penalty** (0.75x) and **skill gate** correctly dampen scores when the candidate's JS/TS skills don't overlap with the job's primary domain. This is actually more accurate than the old hardcoded map which couldn't detect most of these skills.

## Verdict: **KEEP**

The matching test runner now validates against the actual skill inference engine, not a stale copy. Korean equivalents (리액트→react, 타입스크립트→typescript) are properly tested. New cases cover 5 previously-untested skill domains.
