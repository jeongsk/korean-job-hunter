# EXP-128: Korean Skill Alias Keyword Leak Fix

**Date:** 2026-04-05
**Skill:** job-tracking (NLP parser)
**Metric:** nlp_keyword_accuracy

## Hypothesis

23 Korean skill aliases added in EXP-103 (runtimes/ORM/monitoring/desktop/mobile), EXP-116 (blockchain/security/platform), and EXP-101 (modern web tools) were never added to the NLP parser's stopWords list. When users query these skills in Korean (e.g., "솔리디티 공고", "블록체인 공고"), the Korean word matches the skill pattern correctly but also leaks into title/company LIKE search as a spurious second filter.

Additionally, the koreanParticles regex strips final syllables that happen to be Korean particles:
- `블록체인` → `블록체` (인 stripped)
- `그라파나` → `그라파` (나 stripped)
- `패스티파이` → `패스티파` (이 stripped)

This particle stripping happens before the stopWords check, so even adding the full Korean word to stopWords wouldn't catch the truncated form.

## Change

Added 30+ entries to the NLP parser stopWords set:
- 11 Korean aliases from EXP-103: 데노, 레믹스, 아스트로, 패스티파이, 코아, 드리즐, 타입오알엠, 타우리, 캐패시터, 아이오닉, 데이터독
- 13 Korean aliases from EXP-116: 솔리디티, 블록체인, 이더리움, 스마트컨트랙트, 데브시큐옵스, 사이버보안, 모의해킹, 침투테스트, 플랫폼엔지니어링, 플랫폼엔지니어, 이스티오, 아르고시디, 사이트신뢰성
- 3 particle-truncated forms: 블록체, 그라파, 패스티파
- 3 additional aliases: 그라파나, 프로메테우스, 웹3
- Generic noise words: 프레임워크, 프로그래밍, 개발, 엔지니어, etc.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Keyword leaks | 23 | 0 |
| Particle truncation bugs | 3 | 0 |
| New test cases | 0 | 28 |
| Total tests | 1555 | 1583 |
| Regressions | 0 | 0 |

## Affected Queries (Before Fix → After Fix)

- `솔리디티 공고` → was: `[skills LIKE '%solidity%', title LIKE '%솔리디티%']` → now: `[skills LIKE '%solidity%']`
- `블록체인 공고` → was: `[skills LIKE '%blockchain%', title LIKE '%블록체%']` → now: `[skills LIKE '%blockchain%']`
- `그라파나 공고` → was: `[skills LIKE '%grafana%', title LIKE '%그라파%']` → now: `[skills LIKE '%grafana%']`

## Root Cause

Each experiment that added Korean skill aliases to the skill inference module and NLP skill patterns forgot to also add them to the stopWords set. The stopWords are what prevent the Korean word from being treated as an unconsumed keyword that falls through to the title/company LIKE filter.

## Files Changed

- `scripts/nlp-parser.js` — Added 30+ stopWords entries
- `test_nlp_keyword_leak_fix.js` — New test file with 28 test cases
