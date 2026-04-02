# EXP-074: Python Web Framework Cross-Similarity + Angular

**Date:** 2026-04-02
**Skill:** job-matching
**Verdict:** ✅ Keep

## Problem

The similarity map had two gaps affecting matching quality for common Korean job market scenarios:

1. **Python web frameworks had 0% direct similarity**: FastAPI↔Django, FastAPI↔Flask, Django↔Flask all returned 0. They only connected through Python (Tier 2, 75%), but this only helped when the candidate's resume explicitly listed "Python" alongside the framework. If a resume listed just "Django" and the job required "FastAPI", the matching score got no framework similarity credit.

2. **Angular completely missing from frontend framework group**: React↔Vue↔Svelte were in Tier 3 (25%), but Angular — one of the top 4 frontend frameworks — had 0% similarity with all of them. Angular jobs vs React developers scored identically to completely unrelated stacks.

## Hypothesis

Adding same-language web framework cross-similarity (Tier 2, 75%) and adding Angular to the frontend framework group (Tier 3, 25%) will improve matching discrimination without regressions.

## Changes

### Similarity Map Additions

**Tier 2 (75%):**
- FastAPI ↔ Django
- FastAPI ↔ Flask  
- Django ↔ Flask

**Tier 3 (25%):**
- Angular ↔ React
- Angular ↔ Vue
- Angular ↔ Svelte

**PRIMARY_DOMAINS:**
- Added `angular → js/ts` for domain alignment detection

### Files Modified
- `test_validated_matching.js` — similarity maps + 5 new test assertions
- `test_e2e_pipeline.js` — similarity maps + PRIMARY_DOMAINS
- `test_missing_field_robustness.js` — similarity maps + PRIMARY_DOMAINS
- `test_title_skill_inference.js` — similarity maps + PRIMARY_DOMAINS
- `skills/job-matching/SKILL.md` — v3.2 → v3.3
- `agents/matcher-agent.md` — v4.2 → v4.3

## Results

| Metric | Before | After |
|--------|--------|-------|
| Similarity pairs | 41 | 50 (+9) |
| Python framework cross-similarity | 0% | 75% (Tier 2) |
| Angular in frontend group | No | Yes (Tier 3, 25%) |
| New test assertions | — | +5 |
| Total tests | 727 | 732 |
| Regressions | — | 0 |

## Impact Examples

- **Before**: Django candidate vs FastAPI job → skill score ~50 (only Python indirect path, if Python in resume)
- **After**: Django candidate vs FastAPI job → skill score higher via direct Django↔FastAPI (75%)
- **Before**: React developer vs Angular job → 0% frontend framework similarity
- **After**: React developer vs Angular job → 25% frontend framework similarity (correct — shared paradigm)
