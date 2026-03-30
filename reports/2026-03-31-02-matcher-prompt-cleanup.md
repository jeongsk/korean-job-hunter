# EXP-028: Matcher Agent Prompt Cleanup

**Date**: 2026-03-31
**Skill**: job-matching (agent prompt)
**Metric**: Agent clarity / token efficiency
**Verdict**: ✅ Keep

## Problem

matcher-agent.md was 313 lines of mixed validated content and aspirational filler:
- Hallucinated Python APIs: `matcher.calculateAdvancedMatch()`, `matcher.setDebugMode(true)`, `matcher.runValidationTests()`
- Fabricated metrics: "Semantic Understanding Accuracy: 85%+", "Predictive Confidence Reliability: 88%+"
- ML references: "Machine Learning Updates", "A/B Testing", "Regular model retraining"
- Non-actionable sections: "Caching Strategies", "Batch Processing", "Continuous Improvement"
- Verbose troubleshooting for features that don't exist

This wastes tokens when an agent reads the prompt and could mislead it into trying to call non-existent functions.

## Hypothesis

Trimming to only validated, actionable content reduces confusion without changing the actual scoring algorithm.

## Changes

### matcher-agent.md (313 → 162 lines, 48% reduction)
- **Kept**: EXP-017 scoring weights (skill 35%, experience 25%, culture 15%, career 15%, location 10%)
- **Kept**: Tiered similarity mapping (Tier 1-3 with exact credit percentages)
- **Kept**: EXP-021 skill gate mechanism (0.25-1.0 multiplier based on skill score thresholds)
- **Kept**: EXP-024 primary domain alignment (8 language domains, 25% penalty)
- **Kept**: Experience fit scoring with upper-bound consideration
- **Kept**: Culture fit keyword extraction (8 categories)
- **Kept**: Career stage alignment (4 levels with year ranges)
- **Added**: Explicit discrimination requirements (HIGH≥70, MED≤65, gap≥15, LOW≤25)
- **Added**: Clean report format with gate/domain status indicators
- **Removed**: All Python API references
- **Removed**: Fabricated accuracy metrics
- **Removed**: ML/predictive scoring sections
- **Removed**: Caching, batch processing, QA sections
- **Removed**: Troubleshooting for non-existent features

### scraper-agent.md (737 → 732 lines)
- Removed duplicate standalone "Work Type Detection" section (already covered in EXP-025 section)

## Results

| Metric | Before | After |
|--------|--------|-------|
| matcher-agent.md lines | 313 | 162 |
| Parsing tests | 12/12 | 12/12 ✅ |
| Schema tests | 7/7 | 7/7 ✅ |
| Discrimination rules | Preserved | Preserved ✅ |
| Non-actionable API refs | 8+ | 0 |
| Fabricated metrics | 4+ | 0 |

## Impact

- **48% fewer tokens** consumed when loading matcher agent prompt
- **Zero hallucinated API references** that could confuse agents
- **Same validated algorithm** — no behavioral change to matching
- **Explicit discrimination targets** now documented in the prompt for agents to verify against
