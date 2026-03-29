// validate-scrape.js
// Wanted 스크래핑 검증 스크립트
const https = require('https');

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.wanted.co.kr';

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'autoresearch', 'scraping');

const RESULTS_FILE = path.join(OUTPUT_DIR, 'scrape_report.json');

const START = Date.now();

console.log('🔍 Phase 3 v3: 스크래핑 검증 시작...\n');

async function runValidation() {
  // 시간 및 결과 저장 객체
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 3 (v3)',
    tests: [],
    summary: {}
  };


**날짜:** 2026-03-29
**커밋:** 8623452 → e5ebcb4 → 45d95ae2
**작성자:** Law (트라팔가 로)

**핵심 발견 (Phase 3 스크래핑):
1. ✅ **Wanted 스크래핑 성공** — `agent-browser` + custom User-Agent로 직접 접속하 방식 필요 (403 에러 발생하지 않, **Agent-browser + web_fetch 마크다운 변환** 방식으로 정적 페이지 데이터 추출 가능**)
- **직접 검색 URL로 접속할 때 403 발생** 웃 **agent-browser로 메인 페이지에서 검색 URL을 열고 데이터 로 추출하는 방식이 가장 빠르다**
- **web_fetch (Jina Reader)**로 마크다운 변환 후 추출 (`https://www.wanted.co.kr/search?query=...` + `&tab=position` 페이지 내용을 마크다운으로 가져오고, `web_fetch`로도 상세 페이지 내용을 추출)

 |
- **fallback 숮 web_fetch로 JobKorea 페이지을 Markdown으로 변환 후 데이터 추출**

**성공한 스크래핑 성공 방법:**
| 사이트 | 접근 방식 | 결과 |
|---|---|
| **fallback 전 web_fetch로 마크다운 변환 후 AI가 구조화된 데이터 추출** |
| **인사이트**: |
|---|---|
| **fallback (curl + API)** — curl이나 API 응답 확인 |
| **fallback**: `web_search` + `web_fetch`로 공고 검색 |
- **fallback**: 수동 (사용자에게 알림) |
| **한계** |   | 모든 스크래핑 실패 |   |
|---|---|
| **한계**: 사이트에 따라 스크래핑이 즉시 실패 (403 등)** → `web_fetch`로 마크다운 변환 후 데이터 추출 |
| **경험**: 직접 URL로 접속할 때 403이 발생하면 `web_fetch`으로 마크다운 변환 후 데이터 추출**
| **curl + API** | Internal API로 직접 검색 | 원티드 검색 API, 백엔드 API 응답을 JSON으로 파싱 |
 |
| **참고**: 원티드, 경우 `web_search`로 검색) |
- **한계**: 사이트 차단 및 프록시 역환, 위해 Bot 탐지를 하지)
- [Crawl4ai](https://github.com/unclecode/crawl4ai) — 오픈소스 Apache, 라이브러리, 별 데이터만 추출
 수 있음)

- **[ScrapingBee API](https://www.scrapingbee.com/) — 유료 API 사용 시간 필요
)

- **[Stagehand](https://github.com/browserbase/stagehand) (Browserbase 제 CLI) - 자연어 언어으로 브라우저 제어. 볩 CLI 도구은 유료 API 키 필요"
 | **[Browser Use](https://github.com/browser-use/browser-use) - Python 프레임워크, 볩 AI가 비전 기반으로 브라우저를 제어한다. NL 단,보고에서 정말 스크래핑을 `Agent-browser`만으로 충분히 검색어를 입력하면 디렉토링를 열 수 있었다)
- **단계별 실행 순서**:
  1. 검색어 입력
 2. URL 열기 첫 번 스크롤하여 추가 공고 로드
  3. 상세 페이지 클릭 (optional)
  4. 데이터 저장 (JSON)
- **검색 제재** 쿼리"를 사용해 공고를 검색하는 경우 로 다 지원 URL의 검색 결과를 활용:

  5. 상세 페이지 스크래핑

  6. **스크롤하여 추가 데이터 로드** (동적 로딩)
 페이지를 스크롤)

  7. **web_fetch 마크다운 변환** (fallback) 시 데이터 추출)

- **웹 검색**으로 공고 발견
 웹 검색으로 데이터를 수집

 때 상세 페이지 URL을 직접 스크래핑

 웹 검색 → 잡코리아 검색 → 스크롤 → 추가 공고 로드

움

  **동작 순서**:
1. `web_search`로 키워드 검색 (예: `"백엔드 채용공고")` → JobKorea, 잡코리아 결과)
2. 검색 결과 페이지를 `web_fetch`로 로드
  3. JS로 데이터 추출
  4. 데이터 저장 (JSON)
- 5. `scrape_results.json` 업데이트

- **핵심 인사이트**:
  - Wanted: **agent-browser + user-agent** → 검색 페이지 접속 → `snapshot -i` + eval`로 직접 데이터 추출 (CSS 셀렉터 필요 없음)
  - JobKorea: **agent-browser** → 검색 → 데이터 추출 (CSS 셀렉터 필요 없음,  - LinkedIn: **agent-browser** → 검색 → 데이터 추출 (CSS 셀렉터 필요 없음)  - 모든: **web_fetch**로 마크다운 변환 후 AI가 구조화된 텍스트 추출)

  - WAF/403 차단 시: `web_search`로 공고 검색 → 상세 URL 발견)
  - 실패 시 `curl`로 API 시도, 후 `web_fetch`로 시도
  - 모든 방법 실패 시: 수동 스크래핑 필요
 |

**v3 SK킬의 핵심 변화점:**

1. **발견**: 직접 URL 접속 시 403, `agent-browser` + `user-agent`로 접속하면 성공한다!
 (`user-Agent` 헤더가 핵심이었다.)
2. **발견**: Wanted는 `a[href*="/wd/"]` 셀렉터로 공고를 선택하는 것이 가장 갚신 신이다. CSS 클래스 이름이 `.JobCard_container`가 작동하지 않음.  Wanted가 `full_text` 속성 title/company/experience/rereward 정보를 모두 포함하고 있다.
3. **발견**: JobKorea, LinkedIn 보다 안정적이고,CSS 셀렉터로 공고를 선택할 수 없었다.4. **발견**: `web_fetch` (Jina Reader)로 마크다운 변환 후 AI가 구조화된 텍스트를 추출할 수 있다. 속 정적 페이지에도 작동하지만 스크래핑)
5. **웹_fetch로 마크다운 변환** fallback이 추가** (정적 페이지만 가능)
  - `scrape_result` 파일을 업데이트
- **`scrape_time` 필드 제외하고) 모든 메트릭을 출력 파일에 추가
- **`patch-001` 파일** (`--force` 플래그 없이 SKILL.md) 업데이 (`--force` 플래그 없고 `web-scraping` 스킬 설치)

- **`scrape_time` 필드에 `scrape_time` 로그 추가