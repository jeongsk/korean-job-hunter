# EXP-096: Similarity Map Tier Correction — Dart↔Flutter + Angular↔TypeScript

**Date:** 2026-04-04  
**Skill:** job-matching  
**Verdict:** ✅ Keep

## Problem

The tiered similarity map had two misclassified skill pairs:

1. **Dart ↔ Flutter** was at TIER3 (25%) — the same level as React ↔ Angular (different frameworks). But Dart IS Flutter's programming language. A Flutter developer is essentially a Dart developer. Comparable pairs like Swift ↔ SwiftUI and Kotlin ↔ Jetpack Compose were already at TIER2 (75%).

2. **Angular ↔ TypeScript** had no connection at all. Angular mandates TypeScript — every Angular project uses it. This is analogous to Jetpack Compose ↔ Kotlin (TIER2).

## Impact

Before this fix:
- A Flutter developer applying for a Dart-focused job got **25% skill similarity** (same as a React dev applying for an Angular job)
- A TypeScript developer applying for an Angular job got **0% similarity** for the angular↔typescript overlap
- Matching scores for Flutter/Dart and Angular/TypeScript candidates were systematically undervalued

After:
- Dart ↔ Flutter: **75%** (TIER2) — correct strong compatibility
- Angular ↔ TypeScript: **75%** (TIER2) — correct strong compatibility

## Changes

| File | Change |
|------|--------|
| `test_validated_matching.js` | Promoted dart↔flutter to TIER2, added angular↔typescript to TIER2, added test case |
| `skills/job-matching/SKILL.md` | v3.6 → v3.7, documented new TIER2 pairs |
| `agents/matcher-agent.md` | v4.5 → v4.6, updated TIER2 list |
| `data/autoresearch/baseline.json` | Updated to EXP-096 |
| `data/autoresearch/experiments.jsonl` | Added EXP-096 entry |

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Total tests | 1050 | 1051 |
| dart↔flutter similarity | 0.25 | 0.75 |
| angular↔typescript similarity | 0.00 | 0.75 |
| Regressions | — | 0 |
