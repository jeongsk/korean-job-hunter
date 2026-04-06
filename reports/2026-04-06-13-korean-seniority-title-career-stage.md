# EXP-147: Korean Seniority Titles + Title-Embedded Year Ranges

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Experiment ID:** EXP-147

## Hypothesis

`deriveCareerStageFromTitle` only recognized English seniority keywords and Korean 시니어/주니어/리드/리더. Common Korean organizational titles (조직장, 팀장, 파트장, 수석, 책임, 선임) and title-embedded year ranges (e.g., "개발자(12년~20년)") were invisible, causing jobs like "결제 시스템 운영 및 개발 조직장(12년~20년)" to get career_stage=mid instead of lead.

## Change

### 1. Korean organizational titles — lead level
Added detection for: 조직장, 팀장, 파트장, 그룹장, 실장, 본부장, 센터장, 수석

### 2. Korean seniority titles — senior level
Added detection for: 책임, 선임

### 3. Title-embedded year ranges
Two format families:
- `N년~M년`: "개발자(12년~20년)", "프론트엔드 개발자(3년~5년)"
- `N-M년`: "백엔드 엔지니어(5-10년)", "백엔드 개발자(7-12년)"

Uses the upper bound of the range to determine stage (same thresholds as deriveCareerStage: ≤3 junior, ≤7 mid, ≤12 senior, >12 lead).

### 4. Title-embedded year minimum
`N년+` and `N년↑` patterns with +1 bump (same as deriveCareerStage for minimum-experience patterns).

## Results

| Metric | Before | After |
|--------|--------|-------|
| Korean title detection | 리드/리더/시니어/주니어 only | 8 lead + 2 senior titles |
| Year range detection | none | 2 format families |
| Live "조직장" jobs | career_stage=mid | career_stage=lead |
| Live "팀장" jobs | career_stage=mid | career_stage=lead |
| New test cases | 0 | 30 |
| Test regressions | - | 0 |

### Live validation (Wanted API)
- "결제(2차 PG) 시스템 운영 및 개발 조직장(12년~20년)" → lead ✅
- "[미리캔버스] 시니어 프론트엔드 개발자" → senior ✅
- "프론트엔드 개발 리드 (React Native)" → lead ✅
- "VISION AI 연구/개발 분야 (팀장)" → lead ✅

## Files Changed
- `scripts/skill-inference.js`: Added Korean titles + year ranges to deriveCareerStageFromTitle
- `agents/scraper-agent.md`: Updated career_stage documentation
- `test_title_career_stage_korean.js`: 30 new test cases
