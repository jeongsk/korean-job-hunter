# EXP-062: Similarity Map Expansion

**Date:** 2026-04-02
**Skill:** job-matching
**Metric:** technology_similarity_coverage

## Hypothesis

The tiered similarity map has gaps for commonly co-occurring technologies in Korean job listings. Java↔Kotlin (JVM), Docker↔Kubernetes (container ecosystem), React↔React Native (shared paradigm), and Svelte↔React/Vue (component frameworks) all appear in real postings but score 0 similarity, causing under-matching.

## Changes

1. **TIER2 additions (75% similarity):**
   - Java ↔ Kotlin — fully interoperable on JVM, highly transferable skills
   - React ↔ React Native — shared React paradigm, component model, and ecosystem

2. **TIER3 additions (25% similarity):**
   - Docker ↔ Kubernetes — container ecosystem (runtime vs orchestration)
   - Svelte ↔ React — component-based frontend frameworks
   - Svelte ↔ Vue — component-based frontend frameworks

3. **Synced all 3 files:** test_validated_matching.js, skills/job-matching/SKILL.md, agents/matcher-agent.md

4. **Added 5 new similarity test cases** to validate each new mapping

## Design Decision: Docker↔Kubernetes at TIER3

Initially placed at TIER2 (75%) but this inflated LOW scores for cross-domain DevOps jobs (LOW-001: Java/Spring/K8s vs JS candidate scored 29, above the 25 threshold). Docker↔Kubernetes at TIER3 (25%) correctly reflects partial overlap (both container tools, but runtime vs orchestration) without breaking discrimination requirements.

## Results

| Metric | Before | After |
|--------|--------|--------|
| Similarity entries | 17 | 24 |
| Java↔Kotlin | 0 (unrelated) | 0.75 |
| Docker↔Kubernetes | 0 (unrelated) | 0.25 |
| React↔React Native | 0 (unrelated) | 0.75 |
| Svelte coverage | 0 (unrelated) | 0.25 |
| Similarity tests | 7 | 12 |
| Total tests | 586 | 590 |
| Regressions | — | 0 |
| Discrimination | PASS | PASS |

## Impact

Korean job listings commonly list Docker alongside Kubernetes requirements, and many Android/React Native roles list React skills. Previously these scored 0 similarity against candidates with the related technology, producing artificially low match scores. The expanded map improves matching accuracy for these common real-world scenarios.
