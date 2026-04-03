# EXP-090: Resume NLP Skill-Inference Sync

**Date:** 2026-04-03 (EXP-090)
**Skill:** resume-agent
**Metric:** skill extraction sync
**Verdict:** KEEP ✅

## Problem

After EXP-089 updated resume-agent.md to reference `scripts/skill-inference.js` (77 skills) as the single source of truth, `test_resume_nlp.js` still had **inline maps with only 39 skills**. The test was validating stale extraction logic that didn't match what the agent actually uses.

Additionally, 7 skills in `skill-inference.js` were missing Korean equivalents that existed in the old test's inline maps.

## Changes

1. **Replaced inline maps** in `test_resume_nlp.js` with `require('./scripts/skill-inference')` import
2. **Added 32 new test cases** covering all 38 previously-untested skills:
   - Infrastructure: Linux, Nginx, CI/CD, DevOps, Ansible
   - Data Engineering: Spark, Hadoop, Airflow, dbt
   - Cloud: BigQuery, Snowflake, AWS Lambda/S3/SQS
   - Java: JPA/Hibernate
   - Frontend: Redux, Flutter, SwiftUI, Laravel, Rails
   - Game: Unity, Unreal
   - API: GraphQL, REST API, gRPC
   - AI/ML: TensorFlow, PyTorch
   - Design: Figma
   - Messaging: Kafka, RabbitMQ, MSSQL
3. **Fixed 7 missing Korean equivalents** in `skill-inference.js`:
   - `젠킨스` → jenkins
   - `포스트그레스` → postgresql
   - `레디스` → redis
   - `몽고디비` → mongodb
   - `일래스틱` → elasticsearch
   - `S3` standalone (without "AWS" prefix)
   - `SQS` with Korean context words (메시지/큐)
4. Added SKILL_MAP coverage validation test (77 entries, 75/77 self-detect)

## Results

| Metric | Before | After |
|--------|--------|-------|
| Resume NLP tests | 44 | 76 |
| Skill source | Inline maps (39) | skill-inference.js (77) |
| Korean regex gaps | 7 | 0 |
| Total tests | 965 | 997 |
| Regressions | 0 | 0 |

## Impact

- Resume extraction test now validates the **same module** that all 3 post-processors and the matching algorithm use
- Korean-language resumes mentioning 젠킨스, 레디스, 몽고디비 etc. are now correctly extracted by the shared module (not just by the old test)
- Future skill additions to skill-inference.js are automatically tested for resume extraction
