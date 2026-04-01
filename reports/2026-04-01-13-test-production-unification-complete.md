# EXP-056: Complete Test-Production Parser Unification

**Date:** 2026-04-01  
**Skill:** job-scraping  
**Metric:** test_code_accuracy

## Hypothesis

Four test files still had inline `parseWantedJob()` implementations instead of importing from production `scripts/post-process-wanted.js` (identified as remaining work in EXP-055). These copies diverge over time — production bugs won't be caught by tests validating a stale copy.

## Change

Rewrote all 4 test files to import `{ parseWantedJob }` from `scripts/post-process-wanted.js`:

1. **test_e2e_parsing.js** (80→33 lines): Removed entire inline parser, now imports production.
2. **test_live_parse.js** (120→44 lines): Removed inline parser with location/work_type, now imports production (which has all these features).
3. **test_live_wanted.js** (119→59 lines): Removed inline parser. Adapted input format to pass `{ id, title: raw, link }` since production parser expects `title` field for raw text.
4. **test_e2e_pipeline.js** (542→451 lines): Removed ~90-line inline parseWantedJob. Kept inline `parseJobKoreaJob` and `parseKoreanQuery` (no production modules exist yet — future work).

## Results

| Metric | Before | After |
|--------|--------|-------|
| Files with inline parseWantedJob | 5 (all test files) | 0 |
| Total lines across 4 files | 956 | 587 |
| Line reduction | - | 39% |
| Test regressions | - | 0 |
| All 25+ test suites | PASS | PASS |

## Significance

**Single source of truth achieved for Wanted parsing.** Any bug introduced in `scripts/post-process-wanted.js` will immediately fail one or more of the 7 test suites that import it (test_parsing, test_e2e_parsing, test_live_parse, test_live_wanted, test_e2e_pipeline, test_post_process_wanted, test_missing_field_robustness).

## Remaining Work

- `parseJobKoreaJob` and `parseKoreanQuery` in `test_e2e_pipeline.js` still inline (no production modules exist)
- Consider extracting these into `scripts/post-process-jobkorea.js` and `scripts/korean-nlp-query.js`

## Baseline Update

Updated `data/autoresearch/baseline.json` to EXP-056.
