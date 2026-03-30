# EXP-022: Scraper Agent Critical Bugfix & Cleanup

**Date:** 2026-03-30T19:04 KST
**Skill:** job-scraping (agent prompt)
**Focus:** Code correctness - Wanted scraping JS

## Hypothesis
The scraper-agent.md Wanted scraping pattern has a critical runtime bug (`workingText` used before assignment) that would cause the entire Wanted scraping to crash at execution. Fixing this and cleaning up redundant code will improve reliability.

## Issues Found & Fixed

### 1. Critical: `workingText` undefined (runtime crash)
- **Before:** `let remainingText = allText;` followed by `workingText = workingText.replace(...)` — `workingText` was never declared, causing ReferenceError
- **After:** `let workingText = allText.replace(...)` — properly initialized

### 2. Duplicate Strategy 3 block
- The Korean company pattern detection strategy appeared twice with slightly different regex patterns
- Removed the second occurrence (lines ~260-270)

### 3. `escapeRegExp()` declared after first usage
- Function was used in Strategy 2's `forEach` but declared at the bottom
- Moved to top of the eval block (consistent with SKILL.md)

### 4. Noisy/generic company names removed
- Removed words that cause false positives: '안전', '로봇', '엔진', '블랙', '소프트', '클라우드', '커머스', '스퀘어', '스타트업', '게임개발', '모바일게임', 'NFT', 'AR', 'VR', '메타버스', '크립토', '블록체인'
- Removed duplicates: '배달의민족', '우아한형제들', '토스', '카카오뱅크', '토스뱅크', '한컴', '넥슨', '엔씨소프트'
- Removed duplicate '㈜' from Korean indicators array

## Metrics
- **Match tests:** 7/7 passing (unchanged)
- **Discrimination:** PASS (spread: 79)
- **Lines removed:** ~25 (redundant/dead code)
- **Bug severity:** Critical (would crash Wanted scraping entirely)

## Verdict: KEEP
This is a bugfix — the scraper-agent Wanted pattern was broken at runtime. No downside to keeping.
