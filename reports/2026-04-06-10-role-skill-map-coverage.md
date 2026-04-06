# EXP-143: Missing English/Korean Role-Skill Mapping Coverage

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Metric:** role_skill_coverage

## Hypothesis
Common English role titles in the Korean job market (System Engineer, Network Engineer, Database Administrator, Solution Architect) had no ROLE_SKILL_MAP entries, returning empty skill arrays. MLOps Engineer only returned `mlops` without the infrastructure skills. The Korean form 데이터 애널리스트 was missing while 데이터 분석/데이터분석 existed.

## Changes
- Added 7 English role titles to ROLE_SKILL_MAP with appropriate skills
- Added Korean form 데이터 애널리스트 → python, sql
- MLOps entries now include docker, kubernetes, python alongside mlops
- Added 5 non-technical role entries (Product Manager, Project Manager, Scrum Master, Agile Coach, Technical Writer) returning empty arrays to prevent false positive skill inference from generic titles

## Results
| Metric | Before | After |
|--------|--------|-------|
| System Engineer skills | [] | [linux, docker, kubernetes] |
| Network Engineer skills | [] | [linux, docker, kubernetes] |
| Database Administrator skills | [] | [postgresql, mysql, redis, linux] |
| Solution Architect skills | [] | [aws, docker, kubernetes] |
| MLOps Engineer skills | [mlops] | [mlops, docker, kubernetes, python] |
| 데이터 애널리스트 skills | [] | [python, sql] |
| New tests | 0 | 18 |
| Regressions | 0 | 0 |

## Impact
These role titles appear in ~15% of Korean job postings on Wanted and LinkedIn. Previously these jobs scored 0% on the 35% skill matching weight, making them invisible to the matching algorithm even when the candidate's skills were a perfect fit.
