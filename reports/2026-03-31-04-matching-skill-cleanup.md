# EXP-030: Job-Matching SKILL.md Cleanup

**Date**: 2026-03-31
**Skill**: job-matching
**Metric**: agent_clarity / SKILL.md accuracy
**Verdict**: ✅ KEEP

## Hypothesis

Removing hallucinated API references, fabricated quality metrics, and non-actionable filler from job-matching SKILL.md reduces agent confusion without affecting the validated matching algorithm.

## Changes

### Removed (non-actionable / hallucinated)
- `matcher.calculateAdvancedMatch()` — non-existent API
- `matcher.setDebugMode()` — non-existent API
- `matcher.runValidationTests()` — non-existent API
- `matcher.generateMatchInsights()` — non-existent API
- `analyzeJobSemantics()`, `analyzeCandidateProfile()` — non-existent APIs
- Fabricated metrics: "Semantic understanding accuracy: 85%+", "Predictive confidence reliability: 88%+", "Overall match quality improvement: 30%+"
- Performance benchmarks ("Processing time per match: <200ms") — unverifiable
- ML/predictive scoring sections — not implemented
- Backward compatibility, caching, continuous improvement filler
- Redundant candidate profile analysis (already in resume-agent.md)
- Troubleshooting for non-existent debug mode

### Preserved (validated)
- EXP-017 score weights table (35/25/15/15/10)
- EXP-021 skill-gated scoring mechanism
- EXP-024 primary domain alignment
- Technology similarity map (Tiers 1-4)
- Job intent classification keywords
- Company culture keyword extraction
- Discrimination requirements from EXP-028
- Matching workflow steps
- Output format schema
- Career stage mapping table

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| SKILL.md lines | 301 | 123 | -59% |
| Hallucinated API refs | 6 | 0 | -6 |
| Fabricated metric claims | 4 | 0 | -4 |
| Parsing tests | 12/12 | 12/12 | 0 |
| Context tests | 5/5 | 5/5 | 0 |
| Schema tests | 7/7 | 7/7 | 0 |
| NLP query tests | 11/11 | 11/11 | 0 |

## Impact

The SKILL.md was the last major source of hallucinated content. The matcher-agent.md was cleaned in EXP-028, but the SKILL.md it references still contained fabricated APIs and metrics. An agent reading both would encounter contradictory information — the agent prompt says to use specific scoring formulas while the SKILL.md references `matcher.calculateAdvancedMatch()` which doesn't exist. This is now resolved.

## Follow-up Opportunities

- Resume-agent.md (351 lines) could benefit from similar cleanup — has inline JS keyword maps that could be extracted
- No actual integration test exists between scraper → matcher → tracker pipeline
