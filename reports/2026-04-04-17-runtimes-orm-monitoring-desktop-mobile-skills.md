# EXP-103: Runtimes, ORM, Monitoring, Desktop/Mobile Skills

**Date**: 2026-04-04
**Skill**: job-scraping + job-matching + job-tracking
**Status**: ✅ Kept

## Hypothesis

19 common Korean job market skills were missing from skill-inference.js, causing zero-detection for:
- **Runtimes**: Deno, Bun
- **Frameworks**: Remix, Astro, Fastify, Koa
- **ORM**: Drizzle, TypeORM, Sequelize, Mongoose
- **Desktop/Mobile**: Electron, Tauri, Capacitor, Ionic
- **Monitoring**: Sentry, Datadog, Grafana, Prometheus

Jobs mentioning these skills would score 0% for the 35% skill weight component.

## Changes

### Skill Inference (scripts/skill-inference.js)
- Added 19 new skill patterns with Korean+English regex
- Total skills: 104 → 122

### Similarity Map (test_validated_matching.js)
- Added TIER2 connections: Deno↔Node.js, Remix↔Next.js, Electron↔Tauri, Grafana↔Prometheus, Drizzle↔Prisma, Mongoose↔MongoDB, etc.
- Added TIER3 connections: Deno↔Bun, ORM alternatives, Electron↔Tauri, monitoring alternatives, cross-platform mobile
- Fixed 2 duplicate JS object key bugs (express, prisma overwritten by new entries)

### NLP Query Parser (test_korean_nlp_v3.js)
- Added 19 NLP query patterns with Korean equivalents (데노, 일렉트론, 타우리, 센트리, 그라파나, 프로메테우스, 시퀄라이즈, 몽구스, etc.)
- 7 new test cases

### Test Suite
- 34 new test cases across test_skill_inference.js (27), test_korean_nlp_v3.js (7)
- Total: 1209 → 1243 tests, 0 regressions

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Skill patterns | 104 | 122 |
| Similarity connections | ~150 | ~180 |
| NLP skill patterns | 101 | 119 |
| Total tests | 1209 | 1243 |
| Regressions | 0 | 0 |

## Bug Fixes

1. **Duplicate key 'express'**: New TIER2 entries `express: ['fastify']` and `express: ['koa']` overwrote the original `express: ['node.js', 'nestjs']`. Merged into single entry.
2. **Duplicate key 'prisma'**: New TIER3 entry `prisma: ['drizzle']` overwrote original `prisma: ['postgresql', 'mysql', 'mongodb', 'typescript']`. Merged into single entry.
