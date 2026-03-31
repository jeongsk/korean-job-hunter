# EXP-037: Number+Korean Company Name Extraction

**Date:** 2026-03-31
**Skill:** job-scraping
**Metric:** company extraction accuracy
**Verdict:** ✅ KEEP

## Hypothesis

Adding a `\d*` prefix to the Korean company boundary regex and a numKorean fallback in SKILL.md eval code fixes extraction of digit-prefixed Korean company names like "111퍼센트".

## Problem

Company "111퍼센트" (a real Korean tech company) was extracted as "퍼센트" because:
1. The boundary regex `([가-힣]{2,}...)$` matched only the Korean suffix
2. The SKILL.md eval code had no numKorean fallback and "111퍼센트" wasn't in the known companies list

## Changes

1. **test_company_boundary.js**: Changed boundary regex from `([가-힣]{2,}...)` to `(\d*[가-힣]{2,}...)` — matches optional digit prefix before Korean characters
2. **SKILL.md v3.4**: Added numKorean fallback `(\d+[가-힣]{2,}...)$` after known companies check, expanded known list with 5 more companies (111퍼센트, 스패이드, 인터엑스, 윙잇, 에이엑스)
3. **scraper-agent.md**: Documented numKorean fallback strategy (EXP-037)

## Results

| Metric | Before | After |
|--------|--------|-------|
| company_boundary | 15/16 | **16/16** |
| All other tests | PASS | PASS |
| Total assertions | 114+ | 158 |

## Test Coverage

All 158 test assertions pass across 10 test files. Zero regressions.
