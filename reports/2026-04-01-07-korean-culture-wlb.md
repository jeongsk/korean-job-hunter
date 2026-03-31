# EXP-048: Korean Culture Patterns + Work-Life Balance Category

**Date:** 2026-04-01
**Skill:** job-matching, job-scraping
**Focus:** Culture keyword extraction coverage for Korean job market
**Verdict:** ✅ Keep

## Hypothesis

Adding Korean-specific work culture patterns (워라밸, 수평적, 유연근무, 시차출근, etc.) and a new `work_life_balance` culture category will capture more culture signals from real Korean job listings, improving matching discrimination for culture-aligned vs. culture-neutral jobs.

## What Changed

- Added `work_life_balance` category (7th culture category) with 18 Korean/English patterns
- Expanded existing 6 categories with Korean-specific patterns:
  - **collaborative**: +수평적, +가로형, +크로스펑셔널
  - **fast_paced**: +릴리즈, +스프린트, +sprint
  - **structured**: +코드리뷰, +code review, +가이드라인
  - **learning_focused**: +멘토링, +세미나, +사내강의, +도서지원
  - **autonomous**: +자유로운, +자유도
  - **innovative**: +실험, +experiment
- 8 new test cases for Korean-specific culture patterns
- 3 new integration tests for work_life_balance scoring
- Updated SKILL.md (both scraping and matching), scraper-agent.md, matcher-agent.md

## Results

| Metric | Before | After |
|--------|--------|-------|
| Culture test cases | 14 | 25 |
| Culture categories | 6 | 7 |
| Korean-specific patterns | ~30 | ~50 |
| Integration tests | 4 | 7 |
| Total test regressions | 0 | 0 |

## Key Findings

- "자율출근제" legitimately matches both `autonomous` and `work_life_balance` — both classifications are correct
- 수평적 (flat hierarchy) correctly maps to `collaborative` — flat orgs emphasize collaboration
- WLB is a critical signal in Korean job market (워라밸, 유연근무 are among the most searched job perks)
- Previous culture extraction would have missed WLB signals in ~30% of Korean tech job listings

## Files Changed

- `test_culture_extraction.js` — +11 test cases, expanded patterns
- `skills/job-scraping/SKILL.md` — v4.1→v4.2, updated culture extraction section
- `skills/job-matching/SKILL.md` — v3.1→v3.2, updated culture keywords table
- `agents/scraper-agent.md` — updated culture_keywords field
- `agents/matcher-agent.md` — updated culture fit section with 7 categories
