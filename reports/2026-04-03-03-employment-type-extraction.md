# EXP-085: Employment Type Extraction & Matching Alignment

**Date:** 2026-04-03
**Skill:** job-scraping + job-matching
**Status:** ✅ Kept (committed, pushed)

## Problem

Korean job postings commonly specify employment type (정규직/계약직/인턴). The post-processors were stripping these keywords from titles during cleanup but never capturing them as a structured field. This meant:
- Contract (계약직) and intern (인턴) positions scored identically to permanent (정규직) roles
- No way to filter or penalize less desirable employment types
- Missing a critical Korean job market dimension

## Hypothesis

Adding `employment_type` extraction to all post-processors and wiring it into the matching algorithm will provide meaningful discrimination between permanent and non-permanent positions without affecting existing scores.

## Changes

### Post-processors (3 files)
Added `employment_type` field with 4 values:
- `regular` — 정규직 (default when no keyword found)
- `contract` — 계약직, 파견, 위촉, contract position
- `intern` — 인턴, 인턴십, intern
- `freelance` — 프리랜서, freelance

**Files:** `scripts/post-process-wanted.js`, `scripts/post-process-jobkorea.js`, `scripts/post-process-linkedin.js`

### Matching Algorithm
Updated `calculateLocationWorkScore()` in `test_validated_matching.js`:
- +5 bonus when employment type matches candidate preference
- -10 penalty for contract jobs when candidate doesn't want contract
- -15 penalty for intern jobs when candidate doesn't want intern
- Neutral (0) when no preference or no data

### Documentation
- `skills/job-matching/SKILL.md` v3.5
- `agents/matcher-agent.md` v4.4
- `skills/job-scraping/SKILL.md` v5.3
- `agents/scraper-agent.md`

## Results

| Metric | Before | After |
|--------|--------|-------|
| Total tests | 927 | 938 |
| Employment tests | 0 | 11 |
| Employment type field | ❌ | ✅ (4 values) |
| Contract discrimination | None | 10pt penalty |
| Intern discrimination | None | 15pt penalty |
| Regressions | — | 0 |

## Test Coverage

- Regular job + regular preference → 55 (base 50 + 5 match)
- Contract job + regular-only preference → 40 (base 50 - 10 penalty)
- Intern job + regular-only preference → 35 (base 50 - 15 penalty)
- Contract job + contract preference → 55 (base 50 + 5 match)
- No preference → neutral (50)
- No employment_type on job → neutral (50)
- Full match discrimination: regular (89) > contract (88)
- Wanted extraction: 계약직→contract, 인턴→intern, default→regular
- JobKorea extraction: 계약직→contract
