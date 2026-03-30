# EXP-023: Concatenated Text Parsing Fix

**Date:** 2026-03-30
**Skill:** job-scraping
**Focus:** scraper-agent text segmentation

## Hypothesis
Wanted's scraped text often has no spaces between fields (e.g., `"웨이브릿지경력 5-9년합격보상금 100만원"`). Pre-segmenting known boundary markers (`경력`, `합격`, `보상금`) before parsing will dramatically improve field extraction for these edge cases.

## Changes
1. **Pre-segmentation**: Insert spaces before `경력`, `합격`, `보상금`, `성과금` before any other processing
2. **Dash range support**: Experience regex now matches `5-9년` (dash) in addition to `5~9년` (tilde)
3. **Noise cleanup**: Remove standalone `합격` after reward extraction (it's a UI artifact, not useful data)
4. **Test expansion**: Added 3 edge-case test inputs covering real Wanted scraping patterns
5. **Fixed bracket regex**: `/\[.*?\]/g` instead of `/\\[.*?\\]/g`

## Results
- **Before**: 4/5 tests pass, edge cases completely fail (0/3 new cases)
- **After**: 8/8 tests pass (100%)
- Key fix: `"미래엔경력 5년 이상합격보상금 100만원"` now correctly extracts company=미래엔, experience=경력 5년 이상, reward=보상금 100만원

## Verdict: ✅ KEEP

Applied to both test_parsing.js and scraper-agent.md.
