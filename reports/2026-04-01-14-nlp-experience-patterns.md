# EXP-056: N년차/경력 Standalone NLP Patterns

**Date:** 2026-04-01
**Skill:** job-tracking
**Metric:** NLP experience query coverage

## Hypothesis
Adding N년차 (years of experience) pattern and standalone 경력 filter to the NLP parser enables natural Korean experience-level queries without keyword pollution.

## Changes
1. **N년차 pattern**: New regex `(\d+)\s*년차` extracts year number for experience filter
2. **Standalone 경력**: When "경력" appears without 신입 or N년, filters to non-신입-only jobs
3. **년차 stopword leak fix**: Added "년차" to stopWords to prevent it leaking into title/company keyword search
4. **4 new test cases**: 5년차, 3년차+관심, 경력 standalone, 경력 5년 이상+서울

## Results
- NLP tests: 35/35 → 39/39 (100%)
- New patterns: 2 (N년차, standalone 경력)
- Keyword leak: fixed (년차 no longer leaks into keyword search)
- All existing test suites: PASS (0 regressions)

## Example Queries Now Supported
| Input | SQL Filter |
|-------|-----------|
| "5년차 공고 있어?" | `j.experience LIKE '%5%'` |
| "3년차 관심 공고" | `a.status = 'interested' AND j.experience LIKE '%3%'` |
| "경력 공고 있어?" | `j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%'` |
| "경력 5년 이상 서울" | `j.experience LIKE '%5%' AND j.location LIKE '%서울%'` |

## Files Changed
- `test_korean_nlp_v3.js`: +N년차 regex, +경력 standalone filter, +년차 stopword, +4 tests
- `skills/job-tracking/SKILL.md`: v2.4, added N년차/경력 patterns to table
- `agents/tracker-agent.md`: v3.2, added 경력 standalone pattern

## Commit
`c4af40b` — pushed to main
