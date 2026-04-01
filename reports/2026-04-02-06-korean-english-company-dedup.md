# EXP-067: Korean↔English Company Equivalents for Cross-Source Dedup

**Date:** 2026-04-02
**Skill:** job-scraping (cross-source deduplication)
**Focus:** LinkedIn English company names vs Korean source company names

## Hypothesis

LinkedIn uses English company names (Kakao, Naver, LINE) while Wanted/JobKorea use Korean names (카카오, 네이버, 라인). The cross-source dedup `companyMatch` function only did string comparison after normalization, so it could never match 카카오↔Kakao. This meant LinkedIn duplicates were silently missed — only Korean-Korean duplicates between Wanted and JobKorea were detected.

## Bug Found

The existing test "three-sources-same-job" (라인/Wanted + 라인/JobKorea + LINE/LinkedIn) passed because it only checked `expectedDuplicates: 1` (one group exists). It didn't verify that all 3 sources were actually in that group. In reality, the LINE entry was alone — never matched to the 라인 entries.

## Changes

### Korean↔English company equivalence map (25 entries)
카카오↔kakao, 네이버↔naver, 라인↔line, 토스↔toss, 당근마켓↔danggeun, 배달의민족↔baemin, 우아한형제들↔woowa, 삼성↔samsung, 쿠팡↔coupang, 현대↔hyundai, 카카오뱅크↔kakaobank, 토스뱅크↔tossbank, 마켓컬리↔kurly, etc.

### Expanded Korean↔English title equivalents (+9 entries)
Added: 임베디드↔embedded, 시니어↔senior, 주니어↔junior, 플랫폼↔platform, 솔루션↔solution, 서버↔server, 시큐리티↔security, 보안↔security, 클라우드↔cloud.

### New `companyToCanonical()` function
Maps company names to canonical English form for comparison. Falls back to normalized form for companies not in the map.

### 5 new test cases
- 카카오↔Kakao, 네이버↔Naver, 토스↔Toss, 삼성↔Samsung dedup
- False positive prevention: 카카오≠Naver (different companies don't match)

### Group size validation
Added `expectedGroupSize` to test runner. The "three-sources-same-job" test now verifies all 3 sources are actually in one group.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Cross-source dedup tests | 13 | 18 |
| Ko↔En company equivalents | 0 | 25 |
| Ko↔En title equivalents | 12 | 21 |
| Total tests | 642 | 647 |
| Regressions | — | 0 |

## Impact

Any job posted on both LinkedIn (English company name) and a Korean source was previously never deduplicated. For a Korean tech job market where many companies use both Korean and English names, this was a significant gap — potentially creating many duplicate entries in the DB when scraping across all 3 sources.

## Verdict: KEEP
