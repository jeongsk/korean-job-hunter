# EXP-065: Detail Skill Extraction Coverage Expansion + Regex Bugfixes

**Date:** 2026-04-02
**Skill:** job-scraping (detail-page skill extraction)
**Focus:** Test coverage for 50+ untested skill extraction patterns

## Hypothesis

The detail-page skill extraction (EXP-059) had only 12 test cases covering ~25 of 50+ regex patterns. Untested patterns (go, rust, c++, c#, vue, angular, django, fastapi, gcp, azure, rabbitmq, elasticsearch Korean, etc.) could contain broken regexes that silently fail on real JDs.

## Changes

### 22 new test cases added
Covering: go/golang, rust, c++, c#, swift/swiftui disambiguation, scala, ruby, php, vue, angular, django, flask, fastapi, gcp, azure, nestjs, rabbitmq, oracle, tensorflow/pytorch, pandas, graphql, grpc, nuxt.js, react_native, Korean equivalents (루비, 러스트, 스위프트, 코틀린), mixed Korean+English (엘라스틱서치, 레디스, 도커).

### 4 regex bugs discovered and fixed

1. **`c++` regex**: `/\bc\+\+\b/` — `\b` (word boundary) requires `[a-zA-Z0-9_]` on one side, but `+` is not a word character. Fixed to `/c\+\+|\bcpp\b/`.

2. **`c#` regex**: `/\bc#\b/` — same issue, `#` is not a word character. Fixed to `/c#|csharp/`.

3. **`javascript` regex**: `/\bjs\b/` matched "js" in "Vue.js", "Node.js", "Nuxt.js" — false positives. The `\b` boundary exists between `.` (non-word) and `j` (word), so any `.js` suffix triggers it. Fixed with negative lookbehind `(?<![\w.])\bjs\b`.

4. **`elasticsearch` Korean equivalent**: `엘라스틱서치` was not recognized. Added to regex pattern.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Test cases | 12 | 34 |
| Tests passing | 616 | 638 |
| Patterns tested | ~25 | 50+ |
| Bugs found | — | 4 |
| Regressions | — | 0 |

## Impact

The `c++`, `c#`, and `javascript` false positive bugs would have caused real issues in production:
- C++ and C# jobs would never have these skills extracted (silent failure)
- Any job mentioning Vue.js, Node.js, or Nuxt.js would incorrectly get a `javascript` skill tag, inflating matching scores for JS candidates

## Verdict: KEEP
