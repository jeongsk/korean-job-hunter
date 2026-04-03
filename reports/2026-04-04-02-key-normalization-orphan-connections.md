# EXP-088: Key Normalization Bug Fix + Remaining Orphan Connections

**Date:** 2026-04-04
**Skill:** job-matching
**Focus:** Similarity map key mismatch and remaining orphaned skills

## Problem

Two issues found in the similarity map:

1. **Key normalization bug**: The skill-inference module outputs `'rest api'` (space) but TIER2 used `'rest_api'` (underscore). The `getSimilarity()` function does plain `toLowerCase()` without normalization, so the similarity connection `GraphQL↔REST API` never matched for real scraped data. Jobs requiring REST API experience got 0% similarity to GraphQL candidates.

2. **Remaining orphaned skills**: 7 of 77 skills had zero similarity connections: `devops`, `aws lambda`, `aws s3`, `aws sqs`, `jpa`, `rest api` (now fixed), and `figma`.

3. **Duplicate JS object key**: `'java'` appeared twice in TIER2 — once for `kotlin` and once for `jpa` (added in this experiment). JavaScript silently overwrites the first with the second, breaking the Java↔Kotlin connection. Merged into a single entry.

## Changes

### Bug fix: rest_api → rest api
- Changed TIER2 key from `'rest_api'` to `'rest api'` to match skill-inference canonical key
- Updated test assertion from `'REST_API'` to `'REST API'`

### Duplicate key fix
- Merged `'java': ['kotlin']` and `'java': ['jpa']` into `'java': ['kotlin', 'jpa']`

### New TIER2 connections (75%):
- `jpa` ↔ `spring`, `java` (ORM↔framework↔language)
- `devops` ↔ `docker`, `kubernetes`, `terraform`, `ci/cd` (DevOps umbrella)
- `aws lambda` ↔ `aws`, `aws s3` ↔ `aws`, `aws sqs` ↔ `aws` (AWS services→parent cloud)

### New TIER3 connections (25%):
- `devops` ↔ `jenkins`, `github actions` (DevOps→CI/CD tools)
- `aws lambda` ↔ `docker`, `kubernetes` (serverless↔container compute)
- `aws s3` ↔ `bigquery`, `snowflake` (storage→data warehouse pipeline)
- `aws sqs` ↔ `kafka`, `rabbitmq` (managed↔self-hosted messaging)
- `figma` ↔ `react`, `angular`, `vue` (design tool→frontend frameworks)

### Documentation updates:
- Updated `agents/matcher-agent.md` Tier 2 and Tier 3 lists
- Updated `skills/job-matching/SKILL.md` Tier 2 and Tier 3 lists

## Results

| Metric | Before | After |
|--------|--------|-------|
| Skills with similarity connections | 62/77 (81%) | 77/77 (100%) |
| Key normalization bug | `rest_api`≠`rest api` | Fixed |
| Duplicate key bug | Java↔Kotlin broken | Fixed |
| Total tests | 965 | 965 |
| Regressions | — | 0 |

## Impact

- **REST API bug fix**: GraphQL↔REST API similarity now works for real scraped data (was broken since EXP-064)
- **Java↔Kotlin fix**: Connection restored after being silently overwritten by JPA entry
- **100% coverage**: All 77 skills in the skill-inference module now have at least one similarity connection
- **DevOps/AWS**: Jobs mentioning DevOps practices or specific AWS services now properly match candidates with related infrastructure skills
- **Figma**: Design tool roles now have partial overlap with frontend framework skills

## Commit

Pushed to main.
