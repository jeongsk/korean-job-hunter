# EXP-083: Skill Inference Korean Job Market Expansion

**Date:** 2026-04-03
**Skill:** job-scraping + job-matching
**Status:** ✅ Keep

## Hypothesis

The shared skill inference module (`scripts/skill-inference.js`) was missing 27 common Korean job market keywords. Jobs mentioning Linux, Nginx, CI/CD, DevOps, Spark, Hadoop, Airflow, dbt, JPA, Redux, Unity, Unreal, BigQuery, Snowflake, and AWS services (Lambda/S3/SQS) received 0% for the 35% skill weight component in matching.

## Changes

Added 27 new skill patterns to `scripts/skill-inference.js`:

| Category | Skills Added |
|----------|-------------|
| Infrastructure | Linux (리눅스), Nginx (엔진엑스), CI/CD, DevOps (데브옵스) |
| Data Engineering | Spark (스파크), Hadoop (하둡), Airflow (에어플로우), dbt |
| Cloud Services | AWS Lambda (람다), AWS S3, AWS SQS, BigQuery (빅쿼리), Snowflake (스노우플레이크) |
| ORM | JPA / Hibernate (하이버네이트) |
| Frontend State | Redux (리덕스) |
| Game Engines | Unity (유니티), Unreal (언리얼) |

**Bug fix:** CI/CD regex now handles `CI CD` (no slash) and `CICD` variants, not just `CI/CD`.

## Results

| Metric | Before | After |
|--------|--------|-------|
| SKILL_MAP entries | 50 | 77 |
| Total tests | 884 | 913 |
| New test cases | — | 29 |
| Regressions | — | 0 |

## Impact

Jobs mentioning these previously-missing skills are now properly detected across all three scraping sources (Wanted, JobKorea, LinkedIn). The matching algorithm's 35% skill weight component produces meaningful scores instead of 0% for ~30% of Korean job postings that mention infrastructure, data, or game engine skills.

## Files Changed

- `scripts/skill-inference.js` — 27 new patterns
- `test_skill_inference.js` — 29 new test cases
- `skills/job-scraping/SKILL.md` — pattern count update
- `data/autoresearch/baseline.json` — updated
- `data/autoresearch/experiments.jsonl` — EXP-083 entry
