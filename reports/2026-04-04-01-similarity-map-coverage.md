# EXP-087: Expanded Similarity Map Coverage

**Date:** 2026-04-04
**Skill:** job-matching
**Focus:** similarity map coverage gap

## Problem

The skill-inference module extracts 77 distinct skills from job postings, but the tiered similarity map in the validated matching algorithm only had connections for 30 of them. The remaining 47 skills had zero similarity to anything — if a job required `go` and a candidate knew `rust`, or a job required `bigquery` and a candidate knew `snowflake`, they scored 0% similarity despite clear domain overlap.

## Changes

### TIER1 additions (100% similarity):
- `nuxt` ↔ `vue` (alias, like `next.js` ↔ `react`)

### TIER2 additions (75% similarity):
- **Systems languages:** go↔rust
- **Ecosystem pairs:** c#↔.net, ruby↔rails, php↔laravel, swiftui↔swift, jetpack compose↔kotlin
- **Data infrastructure:** bigquery↔snowflake, airflow↔dbt
- **ML ecosystem:** machine learning↔tensorflow/pytorch
- **Infra:** linux↔docker/nginx, ci/cd↔jenkins/github actions
- **Game engines:** unity↔unreal
- **State management:** redux→react (one-way)

### TIER3 additions (25% similarity):
- **Compiled languages:** go↔c++, rust↔c++, c#↔java
- **Data pipeline:** spark↔airflow/dbt, hadoop↔bigquery/snowflake
- **Mobile:** dart↔flutter
- **Data science:** r↔python

### Test additions: 15 new similarity pair tests

## Results

| Metric | Before | After |
|--------|--------|-------|
| Skills with similarity connections | 30/77 (39%) | 62/77 (81%) |
| Similarity pair tests | 28 | 43 |
| Total tests | 950 | 965 |
| Regressions | — | 0 |

## Impact

Jobs requiring Go, Rust, C#, BigQuery, Snowflake, Airflow, dbt, Unity, Unreal, CI/CD, Linux, SwiftUI, Jetpack Compose, Laravel, Rails, Redux, or Machine Learning now properly score against candidates with related skills. Previously these all scored 0% in the 35% skill weight component regardless of the candidate's actual competency.

## Commit

Pushed to main.
