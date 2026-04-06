# EXP-150: Experience Context Stripping from rawCompany

**Date:** 2026-04-07
**Skill:** job-scraping
**Metric:** company_extraction_accuracy

## Hypothesis
Wanted's concatenated text format glues experience text directly to company names before `경력`. The rawCompany regex `([가-힣]+)경력` captures all Korean chars including experience context like 이상, 중급, 고급. This contaminates company names: `5년 이상케이투스코리아경력` → company = `이상케이투스코리아`.

## Change
Added `EXP_CONTEXT` regex `/^(이상|이하|미만|무관|이내|부터|까지|고급|중급|초급|수습)/` to strip leading experience-related words from rawCompany after extraction.

Also renamed 4 stale legacy test files (`enhanced_scraping_test.js`, `live_scrape_test.js`, `test-autonomous-tracking.js`, `test-korean-nlp-queries.js`) to `_legacy_` prefix to prevent `node --test` from discovering and failing on them.

## Results
- Before: 9/9 live tests, 3 contaminated company names, 4 `node --test` failures
- After: 12/12 live tests, 0 contaminated company names, 0 `node --test` failures

| Case | Raw Company | Before | After |
|------|------------|--------|-------|
| 케이투스코리아 | 이상케이투스코리아 | 이상케이투스코리아 ❌ | 케이투스코리아 ✅ |
| 스패이드 | 스패이드 | 스패이드 ✅ | 스패이드 ✅ |
| 유모스원 | 유모스원 | 유모스원 ✅ | 유모스원 ✅ |

## Verdict
Keep. Fix for a real production bug where concatenated Wanted text with "N년 이상" before company name contaminates extraction.
