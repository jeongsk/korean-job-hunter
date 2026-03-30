# EXP-031: Sync Wanted Eval Code with Validated Parsing Logic

**Date:** 2026-03-31
**Skill:** job-scraping
**Metric:** code_sync_accuracy

## Hypothesis
The SKILL.md Wanted eval code was out of sync with the validated parsing logic in test_parsing.js. EXP-023 pre-segmentation and EXP-025 work_type/location detection existed in tests but not in the reference eval code that agents execute. Syncing them ensures agents get the same parsing quality that tests validate.

## Changes
- Integrated pre-segmentation (space insertion before 경력/합격/보상금) into browser eval code
- Integrated work_type detection (remote/hybrid keywords) into eval code
- Integrated location extraction from brackets and bare text into eval code
- Added dash-range support (\d+-\d+년) in experience regex
- Added standalone 합격 noise cleanup
- Removed stale "parsing logic failure" warning (no longer true)
- Removed duplicate User-Agent 핵심 note
- Updated scraper-agent.md JobKorea selector reference
- Added JobKorea fallback selector test file
- Version bump: v3.1 → v3.2

## Baseline
- SKILL.md eval code: no pre-segmentation, no work_type, no location, no dash-ranges
- Stale warning about "0% fields completeness"

## Results
| Metric | Before | After |
|--------|--------|-------|
| Eval code has pre-segmentation | ❌ | ✅ |
| Eval code has work_type | ❌ | ✅ |
| Eval code has location | ❌ | ✅ |
| Eval code has dash-range exp | ❌ | ✅ |
| Parsing tests | 12/12 | 12/12 |
| Schema tests | 7/7 | 7/7 |
| Context tests | 5/5 | 5/5 |
| Matching tests | 7/7 | 7/7 |
| Stale warnings | 1 | 0 |

## Verdict: KEEP
Zero test regressions. The eval code now matches what tests validate. Agents scraping Wanted will now correctly handle concatenated text, detect work_type, extract location, and parse dash-ranges — all features that were validated in earlier experiments but never ported to the reference eval code.
