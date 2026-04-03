# EXP-089: Resume Agent Skill Inference Sync

**Date**: 2026-04-04 02:04 KST
**Skill**: resume-agent
**Metric**: skill coverage parity with job matching

## Problem

Resume agent had **39 skills** in its inline keyword maps while `scripts/skill-inference.js` (used by matching) had **77 skills**. This 38-skill gap meant:

- Kafka, RabbitMQ, GraphQL, REST API, gRPC → invisible to resume parsing
- BigQuery, Snowflake, Airflow, dbt → invisible to resume parsing  
- Figma → invisible to resume parsing
- Linux, Nginx, CI/CD, DevOps → invisible to resume parsing
- Unity, Unreal → invisible to resume parsing
- React Native, Flutter, SwiftUI, Jetpack Compose → invisible to resume parsing
- Spring Boot, Laravel, Rails, .NET → invisible to resume parsing
- AWS Lambda, AWS S3, AWS SQS → invisible to resume parsing
- Redux, JPA → invisible to resume parsing

When a candidate listed any of these 38 skills in their resume, they were **silently dropped** from the matching pipeline. The matcher would see an incomplete skill list and produce lower match scores.

## Root Cause

Resume-agent.md maintained 4 separate inline keyword maps (`languageMap`, `frameworkMap`, `dbMap`, `infraMap`) that were manually maintained and never synced with `scripts/skill-inference.js`. As skill-inference.js grew from ~30 to 77 skills across EXP-049, EXP-052, EXP-083, EXP-087, EXP-088, the resume agent was never updated.

## Fix

1. Removed all 4 inline keyword maps from `agents/resume-agent.md`
2. Added reference to `scripts/skill-inference.js` as single source of truth
3. Added quick-reference category table listing all 77 skills
4. Added usage example with `inferSkills()` function call
5. Updated primary domain detection table with expanded skill lists from skill-inference.js

## Results

| Metric | Before | After |
|--------|--------|-------|
| Resume agent skills | 39 | 77 |
| Skill inference skills | 77 | 77 |
| Gap | 38 | 0 |
| Coverage parity | 51% | 100% |
| Total tests | 965 | 965 |
| Regressions | — | 0 |

## Impact

Candidates listing any of the 38 previously-missing skills will now have them properly extracted and matched. The single-source-of-truth approach prevents future drift — adding a skill to `skill-inference.js` automatically makes it available in both resume parsing and job matching.
