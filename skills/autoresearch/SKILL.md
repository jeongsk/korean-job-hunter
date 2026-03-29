---
name: autoresearch
description: "Autonomous self-improvement loop for korean-job-hunter skills. Modifies skills, measures results, keeps improvements, reverts failures."
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(playwright-cli:*)
  - Bash(sleep)
  - Bash(curl)
  - Bash(git:*)
  - Bash(jq:*)
  - Bash(sqlite3:*)
  - Bash(node:*)
  - Bash(python3:*)
  - Read
  - Write
  - Edit
---

# Autoresearch Skill

korean-job-hunter 스킬들을 자율적으로 개선하는 루프 시스템.

Karpathy의 autoresearch 원칙을 적용:
- **하나의 메트릭**: 각 실험은 하나의 측정 가능한 지표를 개선
- **제한된 범위**: 한 번에 하나의 스킬, 하나의 변수만 변경
- **빠른 검증**: 5분 이내에 결과 확인 가능
- **자동 롤백**: 개선되지 않으면 즉시 revert

---

## 핵심 루프

```
LOOP (최대 N회):
  1. 현재 상태 분석 (baseline 측정)
  2. 개선 가설 수립 (한 가지 변경)
  3. Git에 실험 전 상태 커밋 (checkpoint)
  4. 변경 적용
  5. 테스트 실행 & 메트릭 측정
  6. 결과 비교 (baseline vs 실험)
  7. IF 개선됨:
       → keep, 로그에 기록
     ELSE:
       → git revert, 로그에 기록
  8. 다음 실험
```

---

## 실험 대상 스킬별 메트릭

### job-scraping

| 메트릭 | 설명 | 측정 방법 |
|--------|------|-----------|
| `scrape_success_rate` | 스크래핑 성공률 (%) | 공고 수 / 시도 수 |
| `fields_completeness` | 필드 완성도 (%) | 채워진 필드 / 전체 필드 |
| `scrape_time` | 평균 스크래핑 시간 (초) | wall clock |
| `unique_jobs` | 고유 공고 수 | 중복 제거 후 카운트 |

### job-matching

| 메트릭 | 설명 | 측정 방법 |
|--------|------|-----------|
| `score_spread` | 점수 분포 표준편차 | 통계 계산 |
| `discrimination` | 합격/불합격 점수 격차 | 상위 20% - 하위 20% 평균 |
| `false_positive_rate` | 부정합 공고 높은 점수 비율 | 수동 라벨링 대비 |
| `coverage` | 평가 가능한 공고 비율 (%) | 점수 산출 성공 / 전체 |

### job-tracking

| 메트릭 | 설명 | 측정 방법 |
|--------|------|-----------|
| `query_accuracy` | 쿼리 결과 정확도 | 예상 vs 실제 결과 |
| `response_time` | 쿼리 응답 시간 (ms) | wall clock |

---

## 실험 프로토콜

### Step 1: Baseline 측정

실험 전 현재 스킬의 성능을 측정하여 `data/autoresearch/baseline.json`에 저장.

```bash
# baseline 측정 디렉토리
mkdir -p data/autoresearch

# 현재 Git 상태 기록
git add -A && git commit -m "checkpoint: pre-experiment" --allow-empty
CHECKPOINT=$(git rev-parse HEAD)
echo "{\"checkpoint\": \"$CHECKPOINT\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > data/autoresearch/checkpoint.json
```

### Step 2: 가설 수립

각 실험은 다음 형식으로 문서화:

```json
{
  "id": "EXP-001",
  "skill": "job-matching",
  "hypothesis": "기술 스킬 가중치를 40%에서 50%로 올리면 discrimination이 개선된다",
  "variable": "skill_weight",
  "old_value": 0.40,
  "new_value": 0.50,
  "metric": "discrimination",
  "expected": "increase"
}
```

### Step 3: 변경 적용

SKILL.md 파일의 해당 섹션만 수정. 다른 부분은 건드리지 않음.

### Step 4: 테스트 실행

각 스킬별 테스트 스위트 실행:

#### job-scraping 테스트
```bash
# 테스트: 실제 사이트에서 5개 공고 스크래핑
agent-browser open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 결과를 JSON으로 저장
agent-browser eval "[...document.querySelectorAll('.JobCard_container')].map(card => ({
  title: card.querySelector('.JobCard_title')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location')?.textContent?.trim(),
  link: card.querySelector('a')?.href
}))" --json | jq '.' > data/autoresearch/scrape_result.json

# 메트릭 계산
TOTAL=$(jq 'length' data/autoresearch/scrape_result.json)
WITH_TITLE=$(jq '[.[] | select(.title != null and .title != "")] | length' data/autoresearch/scrape_result.json)
WITH_COMPANY=$(jq '[.[] | select(.company != null and .company != "")] | length' data/autoresearch/scrape_result.json)
UNIQUE=$(jq 'unique_by(.link) | length' data/autoresearch/scrape_result.json)

echo "{\"total\": $TOTAL, \"with_title\": $WITH_TITLE, \"with_company\": $WITH_COMPANY, \"unique\": $UNIQUE, \"fields_completeness\": $(echo "scale=2; ($WITH_TITLE + $WITH_COMPANY) / ($TOTAL * 2) * 100" | bc)}" > data/autoresearch/scrape_metrics.json

agent-browser close
```

#### job-matching 테스트
```bash
# 테스트: 샘플 JD에 대해 매칭 점수 산출
# 테스트 데이터는 data/autoresearch/test_cases/ 디렉토리에 저장
node scripts/test-matching.js 2>/dev/null || python3 scripts/test-matching.py 2>/dev/null || echo "No test script yet, manual evaluation required"
```

### Step 5: 결과 기록

```json
{
  "experiment_id": "EXP-001",
  "timestamp": "2026-03-29T12:00:00Z",
  "skill": "job-matching",
  "hypothesis": "기술 스킬 가중치를 40%에서 50%로 올리면 discrimination이 개선된다",
  "baseline": { "discrimination": 15.2 },
  "result": { "discrimination": 18.7 },
  "delta": +3.5,
  "verdict": "keep"
}
```

### Step 6: Keep or Revert

```bash
# 개선된 경우
if [ "$IMPROVED" = "true" ]; then
  git add -A
  git commit -m "autoresearch: EXP-001 - keep (discrimination +3.5)"
  echo "✅ Kept: improvement confirmed"
else
  # 악화된 경우 - revert
  git checkout $CHECKPOINT -- skills/
  git add -A
  git commit -m "autoresearch: EXP-001 - revert (discrimination -2.1)"
  echo "❌ Reverted: no improvement"
fi
```

---

## 실험 로그

모든 실험 결과는 `data/autoresearch/experiments.jsonl`에 append:

```jsonl
{"id":"EXP-001","skill":"job-matching","metric":"discrimination","baseline":15.2,"result":18.7,"delta":+3.5,"verdict":"keep","timestamp":"2026-03-29T12:00:00Z"}
{"id":"EXP-002","skill":"job-matching","metric":"discrimination","baseline":18.7,"result":17.1,"delta":-1.6,"verdict":"revert","timestamp":"2026-03-29T12:15:00Z"}
```

---

## 실험 후보 생성

스킬을 분석하여 개선 후보를 자동으로 생성:

### job-scraping 개선 후보

1. **셀렉터 튜닝**: 더 안정적인 셀렉터 찾기
2. **대기 전략**: wait-for vs wait --load 최적화
3. **스크롤 전략**: 무한 스크롤 vs 페이지네이션
4. **속도 최적화**: batch 모드 vs 개별 명령
5. **인증 유지**: 세션 재사용 최적화

### job-matching 개선 후보

1. **가중치 튜닝**: 5개 가중치 조합 (40/20/10/15/15)
2. **유사도 맵 확장**: Technology Similarity Map 항목 추가
3. **경력 점수 세분화**: 구간 조정
4. **재택 가중치 동적화**: 사용자 선호도 반영
5. **새로운 메트릭 추가**: 예: 회사 규모, 연봉 범위

### job-tracking 개선 후보

1. **쿼리 최적화**: 인덱스 추가
2. **상태 전이 강화**: 유효성 검증 추가
3. **통계 쿼리 개선**: 집계 성능 최적화

---

## 안전 규칙

1. **한 번에 하나의 변수만 변경**
2. **각 실험은 5분 이내에 검증 가능해야 함**
3. **core 데이터 (jobs.db, resume)는 수정하지 않음**
4. **실패 시 반드시 revert**
5. **최대 실험 횟수 초과 시 중단** (기본: 20회)
6. **연속 5회 revert 시 전략 재검토**

---

## 명령어

### 실험 실행
```
# 단일 실험
autoresearch run --skill job-matching --metric discrimination --max-experiments 1

# 연속 실험 (최대 10회)
autoresearch run --skill job-scraping --metric scrape_success_rate --max-experiments 10

# 전체 스킬 대상
autoresearch run --all --max-experiments 20
```

### 실험 로그 확인
```
autoresearch log --skill job-matching --last 10
autoresearch log --verdict keep --summary
```

### Baseline 측정
```
autoresearch baseline --skill job-scraping
autoresearch baseline --all
```

### 리포트 생성
```
autoresearch report --format markdown --output reports/
```
