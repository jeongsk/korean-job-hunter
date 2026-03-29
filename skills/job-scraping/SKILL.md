---
name: job-scraping
description: "Web scraping workflow for collecting job postings from multiple Korean and international job sites"
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(playwright-cli:*)
  - Bash(sleep)
  - Bash(curl)
---

# Job Scraping Skill

웹 스크래핑을 위해 **agent-browser** 또는 **playwright-cli**를 사용합니다. 두 도구 모두 토큰 효율적이며 AI 에이전트에 최적화되어 있습니다.

## 도구 선택 가이드

| 상황 | 추천 도구 | 이유 |
|------|----------|------|
| 일반적인 스크래핑 | agent-browser | Rust 네이티브, 빠름, 보안 기능 |
| 복잡한 인증 필요 | agent-browser | auth vault, 세션 암호화 지원 |
| 대량 배치 작업 | agent-browser | batch 모드로 오버헤드 감소 |
| Playwright 생태계 활용 | playwright-cli | 기존 Playwright 지식 활용 |
| 클라우드 브라우저 필요 | agent-browser | Browserless/Browserbase/Kernel 지원 |

---

## Agent Browser Setup (권장)

### Installation
```bash
# npm으로 설치
npm install -g agent-browser

# 또는 Homebrew
brew install agent-browser

# Chrome 다운로드 (최초 1회)
agent-browser install
```

### Quick Start
```bash
# 브라우저 열기
agent-browser open https://www.wanted.co.kr

# 스냅샷 캡처 (interactive elements만)
agent-browser snapshot -i

```

### 세션 유지 (로그인 상태 저장)
```bash
# 세션 이름으로 자동 저장/복원
agent-browser --session-name wanted open https://www.wanted.co.kr
```

### 보안 기능
```bash
# 도메인 제한
agent-browser --allowed-domains "wanted.co.kr,*.wanted.co.kr" open https://www.wanted.co.kr
```

---

## 소스별 스크래핑 전략 (v2)

### Wanted (wanted.co.kr) — API 우 agent-browser

원티드는 JS 기반 SPA에서 API로 데이터를 제공한다. `agent-browser`로 JS 렌더링이 필요함.

| 상황 | 전략 | 셀렉터 |
|------|------|
| **1차** | agent-browser (렌더링) | `.JobCard_container`, `[data-testid="job-card"]`, `[class*="JobCard"]` |
| **2차** | agent-browser (CSS fallback) | `h2`, `[class*="title"]`, `[class*="company"]` |
| **3차** | curl + 원티드 검색 API 직접 | |
| **4차** | web_fetch (정적) | `https://r.jina.ai/http://...` |

#### Wanted — Agent Browser (권장)
```bash
# 1. 검색 페이지 열기
agent-browser open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
agent-browser wait --load networkidle

agent-browser snapshot -i
# 채용공고 목록 추출
eval "[...document.querySelectorAll('.JobCard_container, [data-testid=\"job-card\"')].map(card => ({
  title: card.querySelector('.JobCard_title, [data-testid=\"job-title\"')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company, [data-testid=\"company-name\"')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location, [data-testid=\"location\"')?.textContent?.trim(),
  link: card.querySelector('a')?.href,
  work_type: detect_work_type(card),
  scraped_at: new Date().toISOString()
}))" --json
2> jobs.json
```

#### Wanted — Playwright CLI (대안)
```bash
playwright-cli open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
playwright-cli snapshot
23]`;
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container, [data-testid=\"job-card\"]')].map(card => ({
  title: card.querySelector('.JobCard_title, [data-testid=\"job-title\"]')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company, [data-testid=\"company-name"]')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location, [data-testid=\"location"]')?.textContent?.trim(),
  link: card.querySelector('a')?.href
}))"
"
```

#### Wanted — curl Fallback
원티드에서 403이나는 때 사용:
 직접 API 호출
 가능. 로그인이 필요한 경우 `wanted` 파라미터를 사용.
 `/api/chaos/ji/search` 또 `/api/v1/jobs` 등의 public API를 시도:
자세한 내용은 `web_fetch`으로 시도 (주의: 이유)
 일부 정보만 추출 가능.

):

```bash
curl -sLH "Accept: application/json" -H "User-Agent: Mozilla/5.0" \
  "https://www.wanted.co.kr/api/chaos/ji/search?query=백엔드&tab=position&limit=10" | jq '.job_cards[:5]'
```

### Jobkorea (jobkorea.co.kr)
 — agent-browser
렌더링 후 JS 기반
 jobkorea도 동적 페이지이지만 JS 렌더링이 필요함. 아래를 참고.

 잡코리아의 경우 직접 웹훠로 html을 markdown으로 변환 후 셀렉터로 데이터를 추출:

:

```bash
# 1. 검색 페이지 열기
agent-browser open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"
agent-browser wait --load networkidle
agent-browser snapshot -i
# 2. 목록 추출
eval "[...document.querySelectorAll('.list-item, .recruit-item, [data-recruit-id]')].map(item => ({
  title: item.querySelector('.title, .link, h2')?.textContent?.trim(),
  company: item.querySelector('.name, .company, .corp')?.textContent?.trim(),
  link: item.querySelector('a')?.href,
}))" --json 2> jobs.json
```

#### Jobkorea — web_fetch Fallback
agent-browser 실패 시 시도:
```bash
# 정적 페이지는 fetch
web_fetch "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit" --extract-mode markdown
# 응답에서 셀렉터로 데이터 추출
```

### LinkedIn Jobs (Public)
LinkedIn 공개 공고는 스크래핑이 제한적이다. `agent-browser`로 제한적으로 시도:

:

```bash
# 1. 검색 페이지 열기
agent-browser open "https://www.linkedin.com/jobs/search/?keywords={keyword}&location=South+Korea"
agent-browser wait --load networkidle
agent-browser snapshot -i
# 2. 목록 추출
eval "[...document.querySelectorAll('.jobs-search__results-list li, .job-search-card, [class*=\"job-card\"]')].map(job => ({
  title: job.querySelector('.base-search-card__title, h3')?.textContent?.trim(),
  company: job.querySelector('.base-search-card__subtitle, h4')?.textContent?.trim(),
  link: job.querySelector('a')?.href
}))" --json 2> jobs.json
```

#### LinkedIn — web_fetch Fallback
```bash
web_fetch "https://www.linkedin.com/jobs/search/?keywords={keyword}&location=South+Korea" --extract-mode markdown
```

---

## Work Type Detection Helper
JavaScript function detect_work_type(card) {
  const text = card.textContent || '';
  const koreanKeywords = {
    remote: ['재택근무', '전면재택', '풀리모트', '원격근무', 'full remote', 'fully remote'],
    hybrid: ['하이브리드', '주N일 출근', '주N일 재택', 'hybrid', 'flexible'],
    onsite: ['출근', '사무실근무']
  };
  
  const lower = koreanKeywords.map(k => k.toLowerCase());
  return lower ? 'lower : 'onsite'; // default
 not null;
}
```

---

## Fallback Chain (스크래핑 실패 시 순차대 진행)
1. **1차**: agent-browser (렌더링 + JS fallback)
 → 데이터 추출
 2. **2차**: curl + web_fetch (markdown 변환) → 데이터 추출
 3. **3차**: 수동 (API 호출 또는 웹 검색)

 마지막 수단으로 셀렉터 정보 업데이트)

| 셀렉터 상태 | 작업 | 파일 | 상태 |
|------|------|
| 작업 완료 | `.JobCard_container`에 직접 데이터 추출 성공 | ✅ | JS 렌더링 필요 | ✅ |
| `[data-testid="job-card"]` | ✅ | JS 렌더링 필요 | ✅ |
| `h2`, `title` → CSS fallback | → 데이터 추출 | ✅ |
| `[class*="title"]` 유지됨 | ✅ | |
| `[class*="company"]` | 유지됨 | ✅ |
| **Agent-browser** → JS 렌더링 | ✅ |
| **curl + web_fetch** | → 마크다운 변환으로 데이터 추출 | ✅ |
| **수동** | → 마지막 수단 | | ❌ |

| Wanted | API 호출 → 직접 웹 검색 | ❌ |
| 잡코리아 | agent-browser (렌더링) | ❌ |
| LinkedIn | JS 렌더링 필요 | ❌ |

| Jobkorea | CSS 렌더링 필요 | ✅ |
| **Agent-browser + web_fetch** | → 마크다운 가능 | ❌ |

| **Agent-browser** | ✅ | JS 렌더링 필요 | ✅ |
| **curl + web_fetch** | ✅ | 마크다운 변환 | ✅ |
| **수동** | → 최종 수단 | | ❌ |

| Wanted | API 호출 → 직접 웹 검색 | ❌ |
| 잡코리아 | agent-browser (렌더링) | ❌ |
| LinkedIn | JS 렌더링 필요 | ❌ |
| **Agent-browser** | ✅ | JS 렌더링 필요 | ✅ |
| **curl + web_fetch** | ✅ | 마크다운 변환 | ✅ |
| **수동** | → 최종 수단 | | ❌ |
| Wanted | API 호출 (403) 방어) | 직접 검색 API 필요. 원티드는 정적 페이지 + curl로 마크다운 변환 시도, 원티드의 API endpoint(`/api/search`)를 호출하면 web_fetch를 사용해 본문을 읽어보자. | ||
|---|
| |
**Note:** LinkedIn은 로그인이 필요할 수 있으며, 공개 검색만 스크래핑이 가능합니다. |
---

## Rate Limiting Rules

- Minimum delay: 2 seconds between requests to same domain
- Maximum pages per session: 50
- Respect robots.txt
- Stop on 429 (Too Many Requests) or 403 (Forbidden)
- Exponential backoff on rate limit: 5s, 10s, 20s
```

---

## Selector Fallback Patterns (v2)
사이트 구조 변경에 대비한 다중 셀렉터 전략을 사용:

```javascript
// 데이터 추출 시 여러 셀렉터를 순차적으로 시도
// 데이터가 없으면 다음 셀렉터로 넘어감
const extractWithFallback = (source) => {
  const allSelectors = [source.selectors.primary, ...source.selectors.fallback];
  
  for (const selector of allSelectors) {
    const titleSel = source.selectors.title.join(', ');
    const companySel = source.selectors.company.join(', ');
    
    return `[...document.querySelectorAll('${selector}')].map(card => ({
      title: card.querySelector('${titleSel}')?.textContent?.trim(),
      company: card.querySelector('${companySel}')?.textContent?.trim(),
      link: card.querySelector('a')?.href
      selector: '${selector}',
      scraped_at: new Date().toISOString()
    })).filter(item => item.title || item.company)`;
  }
  
  return [];
}
```

### Wanted
```javascript
// Fallback 셀렉터 사용
[...document.querySelectorAll('.JobCard_container, [data-testid="job-card"], .job-card')].map(card => ({
  title: card.querySelector('.JobCard_title, [data-testid="job-title"], h2')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company, [data-testid="company-name"], .company')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location, [data-testid="location"], .location')?.textContent?.trim(),
  link: card.querySelector('a')?.href
}))
```

### Jobkorea
```javascript
[...document.querySelectorAll('.list-item, .recruit-item, [data-recruit-id]')].map(item => ({
  title: item.querySelector('.title, .link, h2')?.textContent?.trim(),
  company: item.querySelector('.name, .company, .corp')?.textContent?.trim(),
  link: item.querySelector('a')?.href
}))
```
```

---

## Date Parsing
```javascript
const parseKoreanDate = (text) => {
  if (!text) return null;
  const monthDay = text.match(/(\d+)월\s*(\d+)일/);
  if (monthDay) {
    const now = new Date();
    return new Date(now.getFullYear(), parseInt(monthDay[1]) - 1, parseInt(monthDay[2]));
  }
  const dDay = text.match(/D-(\d+)/);
  if (dDay) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + parseInt(dDay[1]));
    return deadline;
  }
  const ago = text.match(/(\d+)(일|주)\s*전/);
  if (ago) {
    const date = new Date();
    const unit = ago[2] === '주' ? 7 : 1;
    date.setDate(date.getDate() - parseInt(ago[1]) * unit);
    return date;
  }
  return null;
};
```

---

## Kakao Map Commute Calculation

### API Setup
- Kakao Developers: https://developers.kakao.com/
- REST API key required (set as KAKAO_REST_API_KEY env var)
```bash
export KAKAO_REST_API_KEY="your_api_key_here"
```

### Geocoding (Address to Coordinates)
```bash
curl -s "https://dapi.kakao.com/v2/local/search/address.json?query={address}" \
  -H "Authorization: KakaoAK {KAKAO_REST_API_KEY}"
```

### Transit Route Calculation
```bash
curl -s "https://apis-navi.kakaomobility.com/v1/directions?origin={lon},{lat}&destination={lon},{lat}" \
  -H "Authorization: KakaoAK {KAKAO_REST_API_KEY}"
```

---

## Error Handling (v2)
```bash
# 재시도 (최대 3회)
for i in 1 2 3; do
  result=$(agent-browser eval "[...document.querySelectorAll('.JobCard_container')].length" 2>/dev/null)
  if [ "$result" -gt 0 ]; then break; fi
  sleep 2
done

# 에러 시 스크린샷
agent-browser screenshot --annotate error.png
```

---

## Debugging & Troubleshooting
```bash
# 콘솔 로그 확인
agent-browser console
# 에러 확인
agent-browser errors
# 스크린샷 캡처 (주석 포함)
agent-browser screenshot --annotate page.png
# 대시보드 실행 (실시간 모니터링)
agent-browser dashboard start
```

---

## 도구 비교 요약
| 기능 | agent-browser | playwright-cli |
|------|---------------|----------------|
| 성능 | Rust 네이티브, 빠름 | Node.js 기반 |
| batch 모드 | ✅ 지원 (JSON 배열) | ❌ 미지원 |
| 세션 유지 | ✅ session-name, profile | ⚠️ state-save/load |
| 보안 | ✅ 도메인 allowlist, 액션 정책 | ⚠️ 제한적 |
| 클라우드 브라우저 | ✅ Browserless, Browserbase, Kernel | ❌ 미지원 |
| 대시보드 | ✅ 실시간 모니터링 | ❌ 미지원 |
| iOS 지원 | ✅ Safari 시뮬레이터 | ❌ 미지원 |
| 설치 | npm/brew/cargo | npm |
