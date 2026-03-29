# 개선 리포트 #2 — Phase 1: 자가 개선 인프라 구축

**날짜:** 2026-03-29
**커밋:** 0a0e3f3
**작성자:** Law (트라팔가 로)

---

## 개요

Phase 1 완료. korean-job-hunter 스킬들을 자율적으로 개선할 수 있는 autoresearch 인프라를 구축했다.

## 추가 파일

| 파일 | 설명 |
|------|------|
| `skills/autoresearch/SKILL.md` | autoresearch 스킬 정의 (실험 프로토콜, 메트릭, 명령어) |
| `data/autoresearch/test_cases/matching_cases.json` | 매칭 테스트 케이스 10개 (positive 5, negative 3, borderline 2) |
| `scripts/autoresearch-metrics.js` | baseline 측정 스크립트 |
| `data/autoresearch/baseline.json` | 최초 baseline 측정 결과 |

## Baseline 측정 결과

| 메트릭 | 값 | 설명 |
|--------|-----|------|
| **Discrimination** | **48.8** | positive_avg - negative_avg (클수록 좋음) |
| **Score Spread** | **22.53** | 점수 분포 표준편차 |
| **False Positive** | **0%** | 부정합 공고 높은 점수 비율 |
| **Coverage** | **100%** | 점수 산출 성공률 |
| **Positive Avg** | **80.8** | 합격 예상 공고 평균 점수 |
| **Negative Avg** | **32.0** | 불합격 예상 공고 평균 점수 |
| **Borderline Avg** | **53.5** | 경계선 공고 평균 점수 |

### 테스트 케이스별 점수

| ID | 유형 | 점수 | 기대 범위 | 결과 |
|----|------|------|-----------|------|
| TC-001 | positive | 84 | 70~100 | ✅ |
| TC-002 | positive | 84 | 75~100 | ✅ |
| TC-003 | negative | 28 | 0~30 | ✅ |
| TC-004 | negative | 20 | 0~30 | ✅ |
| TC-005 | positive | 98 | 85~100 | ✅ |
| TC-006 | borderline | 38 | 20~55 | ✅ |
| TC-007 | positive | 74 | 70~100 | ✅ |
| TC-008 | negative | 48 | 0~25 | ⚠️ 약간 초과 |
| TC-009 | negative | 12 | 0~25 | ✅ |
| TC-010 | borderline | 69 | 40~65 | ⚠️ 약간 초과 |

## autoresearch 스킬 구조

### 실험 루프
```
baseline 측정 → 가설 수립 → checkpoint 커밋 → 변경 적용 → 테스트 → keep/revert
```

### 스킬별 메트릭

**job-scraping:** scrape_success_rate, fields_completeness, scrape_time, unique_jobs

**job-matching:** score_spread, discrimination, false_positive_rate, coverage

**job-tracking:** query_accuracy, response_time

### 안전 규칙
- 한 번에 하나의 변수만 변경
- 각 실험 5분 이내 검증
- core 데이터 수정 금지
- 실패 시 반드시 revert
- 최대 20회, 연속 5회 revert 시 중단

## 다음 계획 (Phase 2)

Phase 2에서는 autoresearch 루프를 활용하여:
1. job-matching 가중치 튜닝 (현재: 40/20/10/15/15)
2. Technology Similarity Map 확장
3. 경력 점수 구간 세분화
4. TC-008, TC-010 점수 조정
