# EXP-032: Resume-Agent NLP Test Suite + Bug Fixes

**Date:** 2026-03-31
**Skill:** resume-agent (job-tracking pipeline)
**Focus:** Korean NLP skill extraction validation

## Hypothesis
Creating an automated test suite for the resume-agent's Korean NLP extraction logic would validate correctness and catch bugs — the agent had extensive extraction code but zero tests.

## What Was Done
Created `test_resume_nlp.js` with 44 test cases covering:
- Korean keyword → canonical skill mapping (리액트→react, 타입스크립트→typescript, etc.)
- English keyword extraction (React, Node.js, PostgreSQL)
- Java/JavaScript disambiguation edge case
- Database extraction (포스트그레스→postgresql, 레디스→redis)
- Career stage auto-detection (9 boundary tests)
- Primary domain detection (frontend, backend, devops, data, mobile, fullstack hybrid)
- Mixed Korean/English input
- Edge cases (empty input, abbreviations like 자스→javascript)

## Bugs Found & Fixed

### 1. Java/JavaScript Disambiguation
**Bug:** Used trailing space `'java '` to avoid matching JavaScript — but standalone "Java" without trailing space was missed.
**Fix:** Regex `\bjava\b(?!script)` with word boundaries. Correctly handles "JavaScript, TypeScript, Java" → extracts both.

### 2. Domain Detection Substring Matching
**Bug:** Short indicators like 'r' (data domain) matched as substrings — 'spring' falsely triggered data domain.
**Fix:** Exact word match for indicators ≤ 2 chars.

### 3. Hybrid Domain Threshold Too Strict
**Bug:** Gap of 1 between top domains triggered hybrid (e.g., backend=2, devops=1 → "backend/devops"). Real mixed skills need actual balance.
**Fix:** Only flag hybrid when scores are exactly tied.

## Results
| Metric | Before | After |
|--------|--------|-------|
| Resume NLP tests | 0 | 44/44 (100%) |
| Java detection accuracy | Broken (trailing space hack) | Fixed (regex) |
| Domain false positives | 'r' in 'spring' | Eliminated |
| Hybrid over-detection | backend+devops hybrid | Correct: backend |

## All Tests Passing
- Parsing: 12/12 ✅
- Context: 5/5 ✅
- Schema: 7/7 ✅
- Matching: 7/7 ✅
- NLP queries: 11/11 ✅
- **Resume NLP: 44/44 ✅ (NEW)**
