# Job Hunter

> Claude Code & OpenClaw 플러그인 기반 AI 구직 도우미

채용공고 수집, 이력서 매칭, 지원 현황 추적을 Claude Code와 OpenClaw에서 자동화합니다.

## 주요 기능

- **채용공고 자동 수집**: 원티드, 잡코리아, LinkedIn 공개 공고를 agent-browser + custom User-Agent로 스크래핑
- **이력서 매칭 분석**: 기술 스킬, 경력, 통근 거리, 재택 여부를 종합 분석하여 0~100 점수 산출
- **재택/통근 필터링**: 재택근무 여부 자동 추출, 카카오맵 API로 통근 시간 계산
- **지원 현황 추적**: 관심 → 지원예정 → 지원완료 → 면접 → 합격 파이프라인 관리

## 플랫폼 지원

이 플러그인은 두 가지 플랫폼을 지원합니다:

| 기능 | Claude Code | OpenClaw |
|------|-------------|----------|
| 매니페스트 | `.claude-plugin/plugin.json` | `openclaw.plugin.json` |
| 진입점 | commands/ + agents/ | `extensions/index.ts` |
| 스킬 | `skills/*/SKILL.md` | `skills/*/SKILL.md` (공유) |
| CLI | `/korean-job-hunter:*` | `openclaw job-*` |

## 설치

### Claude Code

#### GitHub에서 직접 설치

```bash
claude plugin install jeongsk/korean-job-hunter
```

#### 로컬 개발용 설치

```bash
git clone https://github.com/jeongsk/korean-job-hunter.git
cd korean-job-hunter
claude --plugin-dir .
```

### OpenClaw

#### npm에서 설치

```bash
openclaw plugins install korean-job-hunter
```

#### 로컬 개발용 설치

```bash
git clone https://github.com/jeongsk/korean-job-hunter.git
cd korean-job-hunter
openclaw plugins install -l .
```

#### 설정

OpenClaw 설정 파일에 플러그인 설정을 추가합니다:

```yaml
plugins:
  entries:
    korean-job-hunter:
      enabled: true
      config:
        kakaoApiKey: "your-kakao-rest-api-key"
        defaultMaxCommute: 60
        dataPath: "data"
```

#### OpenClaw CLI 명령어

```bash
# 채용공고 검색
openclaw job-search --keyword "백엔드" --source wanted

# 매칭 분석
openclaw job-match --job-id abc123

# 지원 현황 추적
openclaw job-track --stats

# 이력서 관리
openclaw job-resume --view
```

### Playwright 설치 (스크래핑용)

```bash
# agent-browser 설치 (필수)
npm install -g agent-browser
agent-browser install  # Chrome 다운로드

# 또는 Playwright (대안)
npx playwright install chromium
```

### MCP 서버 설치 (선택)

```bash
cd mcp-server && npm install && npm run build
```

## 사용법

OpenClaw에 설치하면, 에이전트에게 **자연어로** 요청하거나 **명령어**로 사용할 수 있습니다.

### 워크플로우 (4단계)

```
① 이력서 등록 → ② 공고 검색 → ③ 매칭 분석 → ④ 지원 관리
```

---

### Step 1: 이력서 등록

에이전트에게 말로 알려주거나 PDF/YAML 파일을 제공합니다.

**자연어:**
> "내 이력서 등록해줘. 기술스택은 Node.js, TypeScript, React, PostgreSQL, Docker, AWS. 경력 4년. 재택이나 하이브리드 선호. 집은 서울시 마포구."

**명령어:**
```bash
# PDF 이력서 등록
/korean-job-hunter:job-resume add ./my-resume.pdf

# YAML 이력서 등록
/korean-job-hunter:job-resume add ./resume.yaml

# 현재 이력서 확인
/korean-job-hunter:job-resume show

# 집 주소 등록 (통근 시간 계산용)
/korean-job-hunter:job-resume set-home "서울시 마포구 합정동"
```

---

### Step 2: 채용공고 검색

Wanted, JobKorea, LinkedIn에서 공고를 수집합니다.

**자연어:**
> "백엔드 개발자 공고 찾아줘"
> "재택 가능한 Node.js 공고 Wanted에서만 찾아줘"
> "서울 지역 프론트엔드 공고, 통근 60분 이내로 찾아줘"

**명령어:**
```bash
# 키워드로 검색
/korean-job-hunter:job-search --keyword "백엔드" --location "서울"

# 재택/하이브리드 공고만
/korean-job-hunter:job-search --keyword "Node.js" --remote remote,hybrid

# 통근 60분 이내, 매칭 70점 이상
/korean-job-hunter:job-search --keyword "백엔드" --max-commute 60 --min-match 70

# 특정 소스만
/korean-job-hunter:job-search --keyword "백엔드" --sources wanted,linkedin
```

---

### Step 3: 매칭 분석

수집된 공고를 이력서와 비교하여 0-100점으로 평가합니다.

**자연어:**
> "매칭 점수 높은 순으로 10개만 보여줘"
> "70점 이상 공고만 보여줘"
> "이 공고랑 내 이력서 얼마나 맞는지 분석해줘"
> "재택 가능한 공고만 매칭해줘"

**명령어:**
```bash
# 상위 10개 매칭 결과
/korean-job-hunter:job-match --top 10

# 특정 공고 상세 분석
/korean-job-hunter:job-match --job-id abc123

# 재택 공고만 매칭
/korean-job-hunter:job-match --top 10 --remote-only
```

---

### Step 4: 지원 현황 관리

관심 있는 공고를 파이프라인에서 관리합니다.

**파이프라인:**
```
관심 → 지원예정 → 지원완료 → 면접 → 합격
                              ↘ 서류탈락
                    ↘ 서류탈락
                  면접 → 불합격
```

**자연어:**
> "이 공고 관심 등록해줘"
> "카카오 백엔드 포지션 지원완료로 상태 변경해줘"
> "지원 현황 전체 보여줘"
> "면접 예정인 공고 있어?"

**명령어:**
```bash
# 지원 목록 확인
/korean-job-hunter:job-track list

# 상태 업데이트
/korean-job-hunter:job-track set abc123 --status applied --memo "1차 서류 제출"
/korean-job-hunter:job-track set abc123 --status interview --memo "면접일: 3/20 14:00"
```

---

### 한 번에 다 하기

이력서가 이미 등록된 상태라면, 한 문장으로 전체 워크플로우를 실행할 수 있습니다:

> "백엔드 개발자 공고 찾아서 내 이력서랑 매칭해줘. 70점 이상만 보여줘."

이 한마디면 **스크래핑 → 매칭 → 정렬**까지 자동으로 실행됩니다.

## 매칭 점수 기준 (v2 — autoresearch 최적화)

| 항목 | 가중치 | 설명 |
|------|--------|------|
| 기술 스킬 | **50%** | 필수/우대 기술 일치도 |
| 경력 요건 | **15%** | 요구 경력 충족 여부 |
| 우대사항 | 10% | 우대 조건 부합도 |
| 근무 형태 | 15% | 재택/하이브리드/오피스 선호도 일치 |
| 통근 거리 | **10%** | 최대 허용 시간 대비 실제 통근 시간 |

> 가중치는 autoresearch 실험(EXP-001~006)으로 최적화. discrimination: 48.8 → 52.53 (+7.7%)

## 아키텍처

### Claude Code

```
/korean-job-hunter:job-search (슬래시 명령어)
      │
      ▼
Claude Code (내장 오케스트레이션)
      │
      ├── scraper-agent   → Playwright CLI → 공고 수집·구조화
      ├── resume-agent    → PDF/YAML 파싱 → 이력서 프로필
      ├── matcher-agent   → 이력서 × 공고 → 매칭 점수
      └── tracker-agent   → SQLite → 지원 현황 CRUD
```

### OpenClaw

```
openclaw job-search (CLI 명령어)
      │
      ▼
extensions/index.ts (플러그인 진입점)
      │
      ├── skills/job-scraping  → Playwright CLI → 공고 수집·구조화
      ├── skills/job-matching  → 이력서 × 공고 → 매칭 점수
      └── skills/job-tracking  → SQLite → 지원 현황 CRUD
```

## 데이터 저장

모든 데이터는 로컬에 저장됩니다:
- `data/jobs.db` — SQLite 데이터베이스 (공고, 매칭, 지원 현황)
- `data/resume/master.yaml` — 마스터 이력서

## 환경 변수 (선택)

| 변수 | 용도 |
|------|------|
| `KAKAO_REST_API_KEY` | 카카오맵 API 키 (통근 시간 계산) |

## 프로젝트 구조

```
korean-job-hunter/
├── .claude-plugin/           # Claude Code 매니페스트
├── extensions/               # OpenClaw 플러그인 진입점
├── skills/                   # 공유 Skills (두 플랫폼 모두 사용)
│   ├── job-matching/SKILL.md
│   ├── job-scraping/SKILL.md
│   └── job-tracking/SKILL.md
├── commands/                 # Claude Code 슬래시 커맨드
├── agents/                   # Claude Code 에이전트
├── scripts/                  # 유틸리티 스크립트
├── data/                     # 런타임 데이터 (gitignored)
├── reports/                  # 개선 리포트
├── openclaw.plugin.json      # OpenClaw 매니페스트
├── package.json              # npm 패키지 설정
├── CLAUDE.md                 # Claude Code 프로젝트 instructions
└── README.md
```

## 라이선스

MIT
