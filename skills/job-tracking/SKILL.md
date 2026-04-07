---
name: job-tracking
description: "Job application status tracking with SQLite CRUD, Korean NLP query parsing, pipeline analytics, and smart suggestions"
---

# Job Tracking Skill v2.17 (EXP-159: Region alias queries — 수도권/지방/해외)

## Korean Natural Language Query Parsing

사용자의 자연어 입력을 SQL 쿼리로 변환:

| Korean Pattern | SQL Filter | Example Input |
|---|---|---|
| 면접/면접보는/면접잡힌 | `status = 'interview'` | "면접 잡힌 거 있어?" |
| 지원한/지원완료/냈던 | `status = 'applied'` | "지원한 거 다 보여줘" |
| 관심/북마크/찜해둔 | `status = 'interested'` | "찜해둔 공고" |
| 합격/오퍼 | `status = 'offer'` | "합격한 곳" |
| 탈락/거절/떨어진 | `status IN ('rejected','declined')` | "탈락한 거 빼고" |
| 지원예정/지원할 | `status = 'applying'` | "지원할 거" |
| 불합격 | `status = 'declined'` | "불합격한 곳" |

### Company/Keyword Filter
| Korean Pattern | SQL Filter |
|---|---|
| 카카오/네이버/토스 etc. | `j.company LIKE '%{keyword}%'` |
| 백엔드/프론트/데이터 etc. | `j.title LIKE '%{keyword}%'` |
| 재택/원격/리모트 | `j.work_type = 'remote'` |
| 하이브리드 | `j.work_type = 'hybrid'` |
| 서울/판교/강남 etc. | `j.location LIKE '%{keyword}%'` |
| 점수높은/스코어/매칭 | `ORDER BY m.score DESC` |
| 최신순 | `ORDER BY a.updated_at DESC` |
| 마감순/마감 빠른순 | `ORDER BY j.deadline ASC` |
| 연봉/급여/연수입 | `j.salary IS NOT NULL AND j.salary != '' AND j.salary_min IS NOT NULL` |
| 연봉 NNNN 이상/부터 | `j.salary_min >= NNNN` (만원 단위) |
| 연봉 NNNN~MMMM | `(j.salary_min <= MMMM AND j.salary_max >= NNNN)` (range overlap) |
| 연봉 N억 이상 | `j.salary_min >= N*10000` (억→만원 auto-convert) |
| 마감임박/곧마감 | deadline ≤ 7 days |
| 오늘 마감 | deadline = today |
| 내일 마감 | deadline = tomorrow |
| N일 남은 | deadline within N days |
| 기한 있는/데드라인 있는 | `j.deadline IS NOT NULL AND j.deadline != ''` |
| 마감 (standalone) | `j.deadline IS NOT NULL AND j.deadline != ''` |
| 마감 임박 (with space) | deadline ≤ 7 days |
| 신입 | `j.experience LIKE '%신입%' OR j.experience LIKE '%무관%'` |
| N년 이상 | `j.experience LIKE '%N%'` |
| N년차 | `j.experience LIKE '%N%'` |
| 경력 (standalone) | `j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%'` |

### Employment Type Filter (EXP-095)
| Korean Pattern | SQL Filter | Example Input |
|---|---|---|
| 정규직 | `j.employment_type = 'regular'` | "정규직 공고 있어?" |
| 계약직/파견 | `j.employment_type = 'contract'` | "계약직 관심 공고" |
| 인턴 | `j.employment_type = 'intern'` | "인턴 공고" |
| 프리랜서/프리랜스 | `j.employment_type = 'freelance'` | "프리랜서 공고 있어?" |

### Career Stage Filter (EXP-095)
| Korean Pattern | SQL Filter | Example Input |
|---|---|---|
| 시니어/senior | `j.career_stage = 'senior'` | "시니어 포지션 있어?" |
| 리드 | `j.career_stage = 'lead'` | "리드 포지션 서울" |
| 미드/미들 | `j.career_stage = 'mid'` | "미드 레벨 관심 공고" |
| 주니어/junior | `j.career_stage = 'junior'` | "주니어 공고" |

### Skill-based Filtering (EXP-078)
| Korean/English Pattern | SQL Filter | Example Input |
|---|---|---|
| React / 리액트 | `j.skills LIKE '%react%'` | "React 공고" |
| 파이썬 / Python | `j.skills LIKE '%python%'` | "파이썬 공고" |
| 도커 / Docker | `j.skills LIKE '%docker%'` | "도커 쓰는 공고" |
| 스프링 부트 / Spring Boot | `j.skills LIKE '%spring boot%'` | "스프링 부트 지원한 공고" |
| k8s / 쿠버네티스 / Kubernetes | `j.skills LIKE '%kubernetes%'` | "k8s 서울 공고" |
| 코틀린 / Kotlin | `j.skills LIKE '%kotlin%'` | "코틀린 관심 공고" |
| Node.js / 노드 | `j.skills LIKE '%node.js%'` | "노드 공고" |
| 리눅스 / Linux | `j.skills LIKE '%linux%'` | "리눅스 공고" |
| 데브옵스 / DevOps | `j.skills LIKE '%devops%'` | "데브옵스 공고" |
| 머신러닝 / ML | `j.skills LIKE '%machine learning%'` | "머신러닝 공고" |
| 유니티 / Unity | `j.skills LIKE '%unity%'` | "유니티 게임 공고" |
| 빅쿼리 / BigQuery | `j.skills LIKE '%bigquery%'` | "빅쿼리 공고" |
| 랭체인 / LangChain | `j.skills LIKE '%langchain%'` | "랭체인 공고" |
| 파인튜닝 / Fine-tuning | `j.skills LIKE '%fine-tuning%'` | "파인튜닝 공고" |
| 자연어처리 / NLP | `j.skills LIKE '%nlp%'` | "자연어처리 공고" |

_88 skills total (see test_korean_nlp_v3.js for full list)_

### Deadline Urgency Scoring (EXP-035)

Deadlines are computed into urgency levels for prioritization:

| Days Until Deadline | Urgency | Display |
|---|---|---|
| < 0 | 🔴 expired | "마감됨" |
| 0–3 | 🔴 critical | "오늘/내일 마감!" |
| 4–7 | 🟠 high | "이번 주 마감" |
| 8–14 | 🟡 medium | "2주 이내" |
| 15+ | 🟢 low | "여유" |
| 상시/수시 | ⚪ none | "상시채용" |

```sql
-- Urgency-aware query: upcoming deadlines with match scores
SELECT j.title, j.company, j.deadline,
       CAST(julianday(j.deadline) - julianday(date('now')) AS INTEGER) as days_left,
       m.score
FROM jobs j
LEFT JOIN matches m ON j.id = m.job_id
LEFT JOIN applications a ON j.id = a.job_id
WHERE j.deadline IS NOT NULL AND j.deadline != ''
  AND j.deadline NOT LIKE '%상시%'
  AND CAST(julianday(j.deadline) - julianday(date('now')) AS INTEGER) > 0
  AND a.id IS NULL  -- not yet applied
ORDER BY julianday(j.deadline) ASC, m.score DESC
LIMIT 20
```

Deadline formats parsed: `YYYY.MM.DD`, `YYYY-MM-DD`, `MM/DD`, `상시`, `수시채용`

### Sorting
| Korean Pattern | SQL ORDER |
|---|---|
| 최신순/최근/새로운 | `ORDER BY a.updated_at DESC` |
| 점수순/매칭순/점수높은 | `ORDER BY m.score DESC` |
| 회사순/이름순 | `ORDER BY j.company` |

### Composite Query Builder

```
parse_korean_query(input):
  filters = []
  order = "a.updated_at DESC"
  
  consumedWords = set()
  
  // Sorting (consume keywords early to avoid keyword spill)
  if matches "최신순" → order = "a.updated_at DESC", consume
  if matches "(점수|매칭)순" → order = "m.score DESC", consume
  if matches "마감순|마감 빠른순" → order = "j.deadline ASC", consume
  
  // Status detection
  if matches "면접" → filters.push("a.status = 'interview'")
  if matches "지원(완료|한|했)" → filters.push("a.status = 'applied'")
  if matches "(관심|북마크|찜)" → filters.push("a.status = 'interested'")
  if matches "(합격|오퍼)" → filters.push("a.status = 'offer'")
  if matches "(탈락|거절|떨어)" → filters.push("a.status IN ('rejected','declined')")
  if matches "지원(예정|할)" → filters.push("a.status = 'applying'")
  
  // Salary filter (EXP-050)
  if matches "(연봉|급여|연수입)" → filters.push("j.salary IS NOT NULL AND j.salary != ''")
  
  // Deadline urgency (EXP-050)
  if matches "마감임박|곧마감" → filters.push("deadline within 7 days")
  if matches "오늘 마감" → filters.push("deadline = today")
  if matches "내일 마감" → filters.push("deadline = tomorrow")
  if matches "(\d+)일 남은" → filters.push("deadline within N days")
  if matches "기한 있는|데드라인 있는" → filters.push("j.deadline IS NOT NULL AND j.deadline != ''")
  
  // Work type
  if matches "(재택|원격|리모트)" → filters.push("j.work_type = 'remote'")
  if matches "하이브리드" → filters.push("j.work_type = 'hybrid'")
  
  // Skill-based filtering (EXP-078, EXP-079 multi-skill)
  // Matches tech skill names (English + Korean aliases) against j.skills column
  // Multiple skills are AND-combined: "React TypeScript 공고" → react AND typescript
  // Longer skills block substrings: "spring boot" consumed → "spring" skipped
  // Korean aliases: 파이썬→python, 도커→docker, 스프링→spring, 쿠버네티스→kubernetes, etc.
  // Aliases: k8s→kubernetes, golang→go, JS→javascript
  // "React 공고" → j.skills LIKE '%react%'
  // "파이썬 장고 공고" → j.skills LIKE '%python%' AND j.skills LIKE '%django%'
  // "k8s 서울" → j.skills LIKE '%kubernetes%' AND j.location LIKE '%서울%'
  
  // Negation (빼고/제외/말고): negate only the entity immediately before the marker
  if matches "(빼고|제외|말고)" + entity immediately before marker → that entity gets NOT
  if no entity was negated → fall back to inverting status filter
  
  // Companies (sort by length DESC — prevents 카카오 matching 카카오뱅크)
  companies.sort((a,b) => b.length - a.length)
  for each company:
    if consumed by longer company → skip
    apply with negation if immediately before 빼고/제외/말고
  
  // Location
  for each location keyword:
    apply with negation if immediately before 빼고/제외/말고
  
  // Remaining Korean keywords — BALANCED SQL QUOTES!
  for each remaining Korean word (2+ chars) not in stopwords:
    filters.push("(j.title LIKE '%{word}%' OR j.company LIKE '%{word}%')")
  
  // Negation fallback
  if negation marker present but no entity negated → invert status filter
  
  return { filters, order }
```

## SQLite CRUD Patterns

### Create Application
```bash
sqlite3 data/jobs.db "INSERT INTO applications (id, job_id, status, memo, updated_at) VALUES (lower(hex(randomblob(16))), '{job_id}', '{status}', '{memo}', datetime('now'))"
```

### Upsert Application (Create or Update)
```bash
sqlite3 data/jobs.db "
  INSERT INTO applications (id, job_id, status, memo, updated_at)
  VALUES (lower(hex(randomblob(16))), '{job_id}', '{status}', '{memo}', datetime('now'))
  ON CONFLICT(job_id) DO UPDATE SET status='{status}', memo=COALESCE(NULLIF('{memo}',''), memo), updated_at=datetime('now')
"
```

### Read Applications (Enhanced with Filters)
```bash
# All applications with job info and match score
sqlite3 -json data/jobs.db "
  SELECT a.id, a.status, a.memo, a.updated_at,
         j.title, j.company, j.work_type, j.location, j.commute_min, j.source,
         m.score
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  LEFT JOIN matches m ON a.job_id = m.job_id
  WHERE {filters}
  ORDER BY {order}
  LIMIT {limit}
"
```

### Update Application
```bash
sqlite3 data/jobs.db "UPDATE applications SET status = '{status}', memo = '{memo}', updated_at = datetime('now') WHERE job_id = '{job_id}'"
```

### Delete Application
```bash
sqlite3 data/jobs.db "DELETE FROM applications WHERE id = '{id}'"
```

## Status Transitions

Valid transitions:
```
interested → applying → applied → interview → offer
                                 → rejected
                       → rejected
                     interview → declined
Any status → interested (reset)
```

| Status | Korean | Description |
|--------|--------|-------------|
| interested | 관심 | Bookmarked, considering |
| applying | 지원예정 | Planning to apply |
| applied | 지원완료 | Application submitted |
| rejected | 서류탈락 | Resume rejected |
| interview | 면접 | Interview stage |
| offer | 합격 | Received offer |
| declined | 불합격 | Not selected after interview |

## Pipeline Analytics

### Status Distribution
```bash
sqlite3 -json data/jobs.db "
  SELECT status, COUNT(*) as count
  FROM applications
  GROUP BY status
  ORDER BY CASE status
    WHEN 'offer' THEN 1
    WHEN 'interview' THEN 2
    WHEN 'applied' THEN 3
    WHEN 'applying' THEN 4
    WHEN 'interested' THEN 5
    WHEN 'rejected' THEN 6
    WHEN 'declined' THEN 7
  END
"
```

### Conversion Funnel
```bash
sqlite3 -json data/jobs.db "
  SELECT
    COUNT(CASE WHEN status IN ('interested','applying','applied','interview','offer') THEN 1 END) as active,
    COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
    COUNT(CASE WHEN status = 'interview' THEN 1 END) as interviewing,
    COUNT(CASE WHEN status = 'offer' THEN 1 END) as offers,
    COUNT(CASE WHEN status IN ('rejected','declined') THEN 1 END) as rejected,
    ROUND(100.0 * COUNT(CASE WHEN status = 'interview' THEN 1 END) / NULLIF(COUNT(CASE WHEN status = 'applied' THEN 1 END), 0), 1) as interview_rate,
    ROUND(100.0 * COUNT(CASE WHEN status = 'offer' THEN 1 END) / NULLIF(COUNT(CASE WHEN status = 'interview' THEN 1 END), 0), 1) as offer_rate
  FROM applications
"
```

### Top Scored Jobs (Not Yet Applied)
```bash
sqlite3 -json data/jobs.db "
  SELECT j.title, j.company, j.work_type, j.location, m.score
  FROM jobs j
  LEFT JOIN matches m ON j.id = m.job_id
  LEFT JOIN applications a ON j.id = a.job_id
  WHERE a.id IS NULL AND m.score IS NOT NULL
  ORDER BY m.score DESC
  LIMIT 10
"
```

### Weekly Activity Summary
```bash
sqlite3 -json data/jobs.db "
  SELECT
    date(updated_at, 'weekday 0', '-6 days') as week_start,
    COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_count,
    COUNT(CASE WHEN status = 'interview' THEN 1 END) as interview_count,
    COUNT(*) as total_updates
  FROM applications
  WHERE updated_at >= date('now', '-30 days')
  GROUP BY week_start
  ORDER BY week_start DESC
"
```

## Memo Format Rules

- Plain text, no special characters that break SQL
- Maximum 500 characters
- Escape single quotes: Replace ' with ''
- Include date context when relevant (e.g., "2026-03-30 1차 면접 완료")
- Format: `{date} {event} {details}`

## Smart Suggestions

When showing pipeline, optionally suggest:
- **Stale applications**: `applied` status with no update in 14+ days → "서류 결과 확인해보세요"
- **High-score unapplied**: jobs with score > 70 and no application → "이 공고 점수가 높아요"
- **Deadline urgency**: unapplied jobs with deadline ≤ 3 days → "🔴 {title} 마감이 {N}일 남았어요!"
- **Interview prep**: upcoming interviews → review job details, company info
- **Follow-up needed**: `applied` > 7 days → "팔로업 메일을 보내보세요"
- **Expired cleanup**: jobs past deadline still in `interested`/`applying` → "마감된 공고 정리할까요?"

## Known Companies for NLP Parsing

Common Korean tech companies for query matching:
카카오, 네이버, 삼성, 라인, 우아한형제들, 토스, 쿠팡, 배달의민족, 당근마켓, 야놀자, 크몽, 배민, 넥슨, 엔씨소프트, 네오위즈, 한컴, 카카오뱅크, 토스뱅크, 위메프, 마이플레이스

## Location Keywords for NLP Parsing

서울, 경기, 부산, 대전, 인천, 광주, 대구, 울산, 수원, 이천, 판교, 강남, 영등포, 송파, 성수, 역삼, 잠실, 마포, 용산, 구로, 분당, 일산, 평촌, 세종, 여의도, 신촌, 홍대, 건대, 동탄, 청주, 천안, 양재, 논현, 신사, 삼성, 방배, 광화문, 을지로, 종로, 시흥, 안양, 안산, 평택, 파주, 김포, 창원, 포항

## Region Aliases (EXP-159)

| Alias | SQL Translation |
|-------|----------------|
| 수도권 | `(j.location LIKE '%서울%' OR j.location LIKE '%경기%' OR j.location LIKE '%인천%')` |
| 지방 | `(j.location NOT LIKE '%서울%' AND j.location NOT LIKE '%경기%' AND j.location NOT LIKE '%인천%')` |
| 해외 | `(j.title LIKE '%해외%' OR j.company LIKE '%해외%' OR j.location LIKE '%해외%')` |

Examples: 수도권 리액트 공고, 지방 인턴 공고, 수도권 연봉 6000 이상, 지방 마감임박 공고
