# EXP-133: English Role Title Skill Inference

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Metric:** skill_extraction_coverage

## Hypothesis

English role titles commonly used in Korean job postings (especially Wanted and LinkedIn) returned zero skills from inferSkills() — "Backend Developer", "Full Stack Developer", "Data Scientist", "Data Engineer", "Cloud Engineer" all got empty arrays. Korean equivalents (백엔드, 풀스택) worked because ROLE_SKILL_MAP only had Korean entries plus a few English ones (frontend, sre, qa).

## Change

Added 19 English role title entries to ROLE_SKILL_MAP in scripts/skill-inference.js:
- backend, back-end → node.js, python, java
- fullstack, full stack, full-stack → react, node.js, typescript
- data engineer → spark, airflow, python
- data scientist → python, machine learning
- data analyst → python, sql
- devops → docker, kubernetes, ci/cd
- mobile → flutter, react native
- android → kotlin, java
- cloud → aws, docker, kubernetes
- security → cybersecurity
- platform engineer → kubernetes, docker, linux
- site reliability → kubernetes, prometheus, docker
- embedded → c++, linux, python
- game → unity, c++, c#
- design → figma
- infra → aws, docker, kubernetes, linux

## Results

| Metric | Before | After |
|--------|--------|-------|
| English roles with skills | ~4/19 | 19/19 |
| Test files | 64 | 65 |
| Total tests | 1649 | 1665 |
| Regressions | 0 | 0 |

Real-world impact verified with Wanted API scrape: "Backend Developer" and "Full Stack Developer" titles now get meaningful skill inference instead of empty arrays.

## Why This Matters

Wanted and LinkedIn Korea frequently use English role titles. Previously these jobs scored 0% on the 35% skill matching weight because inferSkills() returned []. A "Backend Developer" position at Kakao would score identically to a "기획자" (planner) role — both getting zero skill points.
