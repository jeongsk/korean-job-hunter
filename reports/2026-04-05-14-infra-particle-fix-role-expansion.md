# EXP-122: Fix 인프라 Particle Stripping + Role Skill Expansion

**Date:** 2026-04-05 13:04 KST
**Skill:** job-tracking (NLP parser) + job-scraping/job-matching (skill inference)
**Focus:** nlp_query_accuracy + skill_extraction_role_coverage

## Hypothesis

Two issues degrading real-world query and skill quality:

1. **Particle stripping bug**: The Korean NLP parser strips `라` as a particle suffix, but `라` is archaic/literary in modern Korean. This breaks `인프라` (infrastructure) → `인프`, causing `인프라 공고` to search for `%인프%` instead of `%인프라%`. Infrastructure jobs are a major segment.

2. **Missing role skill mappings**: 9 common Korean job market roles return empty skills via the role-based fallback: 임베디드, 인프라, 게임, 데이터분석가, 보안, 기술리드, 솔루션아키텍트, 인공지능, AI.

## Changes

### NLP Parser (nlp-parser.js)
- Removed `라` from particle suffix regex. `라` as a standalone particle is archaic (used in literary imperatives like "보라") and never appears in job search queries. Removing it fixes `인프라` while keeping `나`, `야`, `이나` etc. intact.

### Skill Inference (skill-inference.js)
- Added 9 new `ROLE_SKILL_MAP` entries:
  - 임베디드 → c++, linux, python
  - 인프라 → aws, docker, kubernetes, linux
  - 게임 → unity, c++, c#
  - 데이터 분석/데이터분석 → python, sql
  - 보안 → cybersecurity
  - 기술 리드 → python, java, aws
  - 솔루션 아키텍트 → aws, docker, kubernetes
  - 인공지능 → python, tensorflow, pytorch
  - ai → python, tensorflow, pytorch

## Results

| Metric | Before | After |
|--------|--------|-------|
| `인프라 공고` query | `%인프%` (wrong) | `%인프라%` (correct) |
| `inferSkills('임베디드 엔지니어')` | [] | [c++, linux, python] |
| `inferSkills('인프라 엔지니어')` | [] | [aws, docker, kubernetes, linux] |
| `inferSkills('게임 개발자')` | [] | [unity, c++, c#] |
| `inferSkills('데이터 분석가')` | [] | [python, sql] |
| `inferSkills('보안 엔지니어')` | [] | [cybersecurity] |
| `inferSkills('인공지능 엔지니어')` | [machine learning] only | [python, tensorflow, pytorch] |
| ROLE_SKILL_MAP entries | 17 | 26 |
| Total tests | 1428 | 1437 |
| Regressions | 0 | 0 |

## Impact

- **NLP queries for infrastructure jobs** now work correctly. "인프라 공고" is a common query pattern that was producing wrong results.
- **9 additional role titles** now have meaningful skill inference instead of empty arrays, improving matching scores for embedded, infrastructure, game, data analysis, security, AI, and architecture positions.
