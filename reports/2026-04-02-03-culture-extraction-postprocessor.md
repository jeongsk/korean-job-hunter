# EXP-063: Culture Extraction in Post-Processor + Score Alignment

**Date:** 2026-04-02
**Skill:** job-scraping + job-matching
**Metric:** culture weight activation + score consistency

## Hypothesis
Adding culture keyword extraction to `post-process-wanted.js` activates the matching algorithm's 15% culture weight for real scraped jobs. Also fixing the default culture score inconsistency (50 in matching tests vs 70 in culture tests) prevents score drift.

## Changes

### 1. Culture extraction added to post-processor
- Added `CULTURE_PATTERNS` (7 categories) and `extractCultureKeywords()` to `scripts/post-process-wanted.js`
- `parseWantedJob()` now outputs `culture_keywords` field (array)
- Even short card text triggers detection for common patterns (스타트업→fast_paced, 워라밸→work_life_balance, 성장→learning_focused)
- `extractCultureKeywords()` exported for reuse on detail page text

### 2. Default score alignment
- Fixed `test_culture_extraction.js`: default culture score from 70→50 to match `test_validated_matching.js`
- Without this fix, culture scores from different test suites were inconsistent by 20 points (3% total score)

### 3. SKILL.md updated to v4.7
### 4. scraper-agent.md updated (culture_keywords now auto-extracted from card text)

## Results

| Metric | Before | After |
|--------|--------|-------|
| Culture in post-processor | ❌ Not implemented | ✅ 7 categories, 16 tests |
| Default score consistency | ❌ 50 vs 70 mismatch | ✅ Aligned to 50 |
| Total tests | 590 | **606** |
| Test suites | 32 | **33** |
| Regressions | — | 0 |

## Impact
The 15% culture weight was effectively dead for all real scraped jobs (always scored 50/neutral). Now:
- Card text with "스타트업" → culture_keywords: ["fast_paced"] → non-neutral culture score
- Detail page text with richer descriptions → multiple culture keywords detected
- This means the matching algorithm can now differentiate between a startup job and a corporate job on the culture dimension

## Files Changed
- `scripts/post-process-wanted.js` — added culture extraction
- `test_culture_postprocess.js` — new test file (16 tests)
- `test_culture_extraction.js` — fixed default score 70→50
- `skills/job-scraping/SKILL.md` — v4.7
- `agents/scraper-agent.md` — culture_keywords field updated
- `data/autoresearch/baseline.json` — updated
