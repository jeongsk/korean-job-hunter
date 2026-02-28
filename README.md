# Job Hunter

> Claude Code & OpenClaw 플러그인 기반 AI 구직 도우미

채용공고 수집, 이력서 매칭, 지원 현황 추적을 Claude Code와 OpenClaw에서 자동화합니다.

## 주요 기능

- **채용공고 자동 수집**: 원티드, 잡코리아, LinkedIn 공개 공고를 Playwright로 스크래핑
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
npx playwright install chromium
```

### MCP 서버 설치 (선택)

```bash
cd mcp-server && npm install && npm run build
```

## 사용법

모든 명령어는 `/korean-job-hunter:` 접두사를 사용합니다.

### 1. 이력서 등록

```bash
# PDF 이력서 등록
/korean-job-hunter:job-resume add ./my-resume.pdf

# YAML 이력서 직접 편집
/korean-job-hunter:job-resume add ./resume.yaml

# 현재 이력서 확인
/korean-job-hunter:job-resume show

# 집 주소 등록 (통근 시간 계산용)
/korean-job-hunter:job-resume set-home "서울시 마포구 합정동"
```

### 2. 채용공고 검색

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

### 3. 매칭 분석

```bash
# 상위 10개 매칭 결과
/korean-job-hunter:job-match --top 10

# 특정 공고 상세 분석
/korean-job-hunter:job-match --job-id abc123

# 재택 공고만 매칭
/korean-job-hunter:job-match --top 10 --remote-only
```

### 4. 지원 현황 관리

```bash
# 지원 목록 확인
/korean-job-hunter:job-track list

# 상태 업데이트
/korean-job-hunter:job-track set abc123 --status applied --memo "1차 서류 제출"
/korean-job-hunter:job-track set abc123 --status interview --memo "면접일: 3/20"
```

## 매칭 점수 기준

| 항목 | 가중치 | 설명 |
|------|--------|------|
| 기술 스킬 | 40% | 필수/우대 기술 일치도 |
| 경력 요건 | 20% | 요구 경력 충족 여부 |
| 우대사항 | 10% | 우대 조건 부합도 |
| 근무 형태 | 15% | 재택/하이브리드/오피스 선호도 일치 |
| 통근 거리 | 15% | 최대 허용 시간 대비 실제 통근 시간 |

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
├── .claude-plugin/
│   ├── plugin.json           # Claude Code 플러그인 매니페스트
│   └── marketplace.json      # 마켓플레이스 메타데이터
├── extensions/
│   └── index.ts              # OpenClaw 플러그인 진입점
├── skills/                   # 공유 Skills (두 플랫폼 모두 사용)
│   ├── job-matching/SKILL.md # 매칭 알고리즘 스킬
│   ├── job-scraping/SKILL.md # 스크래핑 스킬
│   └── job-tracking/SKILL.md # 지원 추적 스킬
├── commands/                 # Claude Code 슬래시 커맨드
│   ├── job-match.md
│   ├── job-resume.md
│   ├── job-search.md
│   └── job-track.md
├── agents/                   # Claude Code 에이전트
│   ├── matcher-agent.md
│   ├── resume-agent.md
│   ├── scraper-agent.md
│   └── tracker-agent.md
├── mcp-server/               # MCP 서버 (선택)
├── openclaw.plugin.json      # OpenClaw 플러그인 매니페스트
├── package.json              # npm 패키지 설정 (openclaw.extensions 포함)
├── CLAUDE.md                 # Claude Code 프로젝트 instructions
└── README.md                 # 이 파일
```

## 라이선스

MIT
