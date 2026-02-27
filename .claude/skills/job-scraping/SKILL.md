---
name: job-scraping
description: "Web scraping workflow for collecting job postings from multiple Korean and international job sites"
allowed-tools:
  - Bash(playwright-cli:*)
  - Bash(sleep)
  - Bash(curl)
---

# Job Scraping Skill

웹 스크래핑을 위해 playwright-cli를 사용합니다. 이 방식은 토큰 효율적이며 AI 에이전트에 최적화되어 있습니다.

## Playwright CLI Setup

### Prerequisites
```bash
# Install playwright-cli globally
npm install -g @playwright/cli@latest

# Install skills for Claude Code
npx @playwright/cli@latest install --skills
```

### Local Installation (Fallback)
전역 설치가 실패하면 npx를 사용:
```bash
npx playwright-cli open https://example.com
npx playwright-cli click e1
```

## Basic Scraping Workflow

### 1. 브라우저 열기 및 페이지 이동
```bash
# 브라우저 열기 (headless 모드가 기본)
playwright-cli open https://www.wanted.co.kr/search?query=개발자&tab=position

# 또는 --headed 플래그로 브라우저 확인 가능
playwright-cli open https://www.wanted.co.kr --headed
```

### 2. 페이지 스냅샷 캡처
```bash
# 현재 페이지 상태를 스냅샷으로 캡처 (요소 ref 확인)
playwright-cli snapshot

# 파일로 저장
playwright-cli snapshot --filename=wanted-search.yaml
```

### 3. 요소 상호작용
```bash
# 클릭 (e#은 snapshot에서 확인한 요소 ref)
playwright-cli click e15

# 텍스트 입력
playwright-cli type "검색어"

# 키 입력
playwright-cli press Enter

# 폼 채우기
playwright-cli fill e5 "user@example.com"
```

### 4. 데이터 추출
```bash
# JavaScript 실행으로 데이터 추출
playwright-cli eval "document.title"
playwright-cli eval "[...document.querySelectorAll('.job-card')].map(el => el.textContent)"

# 특정 요소에서 텍스트 추출
playwright-cli eval "el => el.textContent" e15
```

### 5. 세션 종료
```bash
playwright-cli close
```

## Source-Specific Patterns

### Wanted (wanted.co.kr)

```bash
# 1. 검색 페이지 열기
playwright-cli open "https://www.wanted.co.kr/search?query={keyword}&tab=position"

# 2. 스냅샷 캡처하여 요소 확인
playwright-cli snapshot

# 3. 채용공고 목록 추출
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container')].map(card => ({
  title: card.querySelector('.JobCard_title')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location')?.textContent?.trim(),
  link: card.querySelector('a')?.href
}))
"

# 4. 상세 페이지 이동 (요소 클릭)
playwright-cli click e15
playwright-cli snapshot

# 5. 상세 내용 추출
playwright-cli eval "document.querySelector('.job-description')?.textContent"

# 6. 뒤로 가기
playwright-cli go-back
```

### Jobkorea (jobkorea.co.kr)

```bash
# 1. 검색 페이지 열기
playwright-cli open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"

# 2. 스냅샷 캡처
playwright-cli snapshot

# 3. 채용공고 목록 추출
playwright-cli eval "
[...document.querySelectorAll('.list-item')].map(item => ({
  title: item.querySelector('.title')?.textContent?.trim(),
  company: item.querySelector('.name')?.textContent?.trim(),
  link: item.querySelector('a')?.href
}))
"

# 4. 상세 페이지 이동 (새 탭에서 열리는 경우)
playwright-cli click e20
playwright-cli tab-list
playwright-cli tab-select 1
playwright-cli snapshot

# 5. 상세 내용 추출
playwright-cli eval "document.querySelector('.view-content')?.textContent"

# 6. 탭 닫고 원래 탭으로
playwright-cli tab-close
playwright-cli tab-select 0
```

### LinkedIn Jobs (Public)

```bash
# 1. 검색 페이지 열기
playwright-cli open "https://www.linkedin.com/jobs/search/?keywords={keyword}&location={location}"

# 2. 스냅샷 캡처
playwright-cli snapshot

# 3. 채용공고 목록 추출 (공개 리스트만)
playwright-cli eval "
[...document.querySelectorAll('.jobs-search__results-list li')].map(job => ({
  title: job.querySelector('.base-search-card__title')?.textContent?.trim(),
  company: job.querySelector('.base-search-card__subtitle')?.textContent?.trim(),
  link: job.querySelector('a')?.href
}))
"
```

## Session Management

### Named Sessions (여러 사이트 동시 스크래핑)
```bash
# Wanted 세션
playwright-cli -s=wanted open "https://www.wanted.co.kr"

# Jobkorea 세션 (별도 브라우저)
playwright-cli -s=jobkorea open "https://www.jobkorea.co.kr"

# 세션 목록 확인
playwright-cli list

# 특정 세션에서 작업
playwright-cli -s=wanted snapshot
playwright-cli -s=jobkorea snapshot

# 모든 브라우저 종료
playwright-cli close-all
```

### Persistent Session (로그인 유지)
```bash
# persistent 프로필 사용
playwright-cli open "https://www.wanted.co.kr" --persistent

# 또는 특정 프로필 디렉토리 지정
playwright-cli open "https://www.wanted.co.kr" --profile=/path/to/profile

# 로그인 상태 저장
playwright-cli state-save auth.json

# 로그인 상태 복원
playwright-cli state-load auth.json
```

## Work Type Detection

### Korean Keywords
| Work Type | Keywords |
|-----------|----------|
| remote | 재택근무, 전면재택, 풀리모트, 원격근무, full remote, fully remote |
| hybrid | 하이브리드, 주N일 출근, 주N일 재택, hybrid, flexible |
| onsite | 출근, 사무실근무 (default if no keywords found) |

### Address Extraction
- Look for patterns: "근무지:", "사무실:", "위치:", "주소:"
- Common format: "서울시 XX구 XX동" or "서울 XX구"
- Normalize to consistent format for Kakao Map API

## Rate Limiting Rules

- Minimum delay: 2 seconds between requests to same domain
- Maximum pages per session: 50
- Respect robots.txt
- Stop on 429 (Too Many Requests) or 403 (Forbidden)
- Exponential backoff on rate limit: 5s, 10s, 20s

### 지연 구현 (Bash sleep 사용)
```bash
# 페이지 간 2초 대기
sleep 2
playwright-cli goto "https://www.wanted.co.kr/page/2"
```

## Error Handling

### 요소 대기 및 타임아웃
```bash
# 요소가 나타날 때까지 대기 (최대 5초)
playwright-cli wait-for ".JobCard_container" --timeout=5000

# 페이지 로드 대기
playwright-cli wait-for-load-state networkidle
```

### 실패 시 재시도 패턴
```bash
# 클릭 재시도 (최대 3회)
for i in 1 2 3; do
  playwright-cli click e15 && break
  sleep 1
done

# 강제 클릭 (일반 클릭 실패 시)
playwright-cli click e15 --force
```

### 네트워크 오류 대응
```bash
# 페이지 로드 실패 시 재시도
playwright-cli goto "https://www.wanted.co.kr" --retry=3 --retry-delay=2000
```

### 빈 결과 처리
```bash
# 결과 확인 후 처리
result=$(playwright-cli eval "[...document.querySelectorAll('.job-card')].length")
if [ "$result" -eq 0 ]; then
  echo "No results found, trying alternative selectors..."
  playwright-cli eval "[...document.querySelectorAll('[data-testid=\"job-card\"]')].length"
fi
```

## Selector Fallback Patterns

사이트 구조 변경에 대비한 다중 셀렉터 전략:

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

## Data Output Format

### JSON 저장 (권장)
```bash
# 타임스탬프와 함께 저장
playwright-cli eval "JSON.stringify([...document.querySelectorAll('.JobCard_container')].map(...))" \
  | jq '.' > "jobs_$(date +%Y%m%d_%H%M%S).json"

# 예쁜 포맷팅
playwright-cli eval "..." | jq '.' > jobs.json
```

### CSV 변환
```bash
# JSON을 CSV로 변환
playwright-cli eval "..." | jq -r '(.[0] | keys_unsorted) as $keys | $keys, map([.[ $keys[] ]])[] | @csv' > jobs.csv
```

### 중복 제거
```bash
# 링크 기준 중복 제거
playwright-cli eval "..." | jq 'unique_by(.link)' > jobs_unique.json

# 회사+제목 기준 중복 제거
playwright-cli eval "..." | jq 'unique_by(.company + .title)' > jobs_unique.json
```

## Date Parsing

### 한국어 날짜 형식
```javascript
// 등록일/마감일 파싱
const parseKoreanDate = (text) => {
  if (!text) return null;

  // "2월 27일" 형식
  const monthDay = text.match(/(\d+)월\s*(\d+)일/);
  if (monthDay) {
    const now = new Date();
    return new Date(now.getFullYear(), parseInt(monthDay[1]) - 1, parseInt(monthDay[2]));
  }

  // "D-3", "D-7" 형식 (마감일)
  const dDay = text.match(/D-(\d+)/);
  if (dDay) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + parseInt(dDay[1]));
    return deadline;
  }

  // "3일 전", "1주 전" 형식
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

### 스크래핑에 적용
```bash
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container')].map(card => {
  const dateText = card.querySelector('.date, .posted-date')?.textContent;
  return {
    title: card.querySelector('.JobCard_title')?.textContent?.trim(),
    posted_date: dateText,
    // 파싱은 후처리에서 수행
  };
})
"
```

## Kakao Map Commute Calculation

### API Setup
- Kakao Developers: https://developers.kakao.com/
- REST API key required (set as KAKAO_REST_API_KEY env var)

### 환경변수 설정
```bash
# .env 파일 생성
echo "KAKAO_REST_API_KEY=your_api_key_here" > .env

# 또는 export
export KAKAO_REST_API_KEY="your_api_key_here"

# 확인
echo $KAKAO_REST_API_KEY
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

### Fallback
- If KAKAO_REST_API_KEY not set: Skip commute calculation, set commute_min = NULL
- If address geocoding fails: Set commute_min = NULL, log warning

## Complete Scraping Example

```bash
# 1. 브라우저 열기
playwright-cli open "https://www.wanted.co.kr/search?query=프론트엔드&tab=position"

# 2. 페이지 로드 대기
playwright-cli wait-for ".JobCard_container" --timeout=5000

# 3. 초기 스냅샷
playwright-cli snapshot

# 4. 채용공고 추출 (fallback 셀렉터 포함)
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container, [data-testid=\"job-card\"]')].map(card => ({
  title: card.querySelector('.JobCard_title, [data-testid=\"job-title\"]')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company, [data-testid=\"company-name\"]')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location, [data-testid=\"location\"]')?.textContent?.trim(),
  link: card.querySelector('a')?.href,
  scraped_at: new Date().toISOString()
}))
" | jq '.' > "jobs_$(date +%Y%m%d_%H%M%S).json"

# 5. 스크롤하여 더 많은 결과 로드
playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"
sleep 2

# 6. 추가 결과 추출 및 병합
playwright-cli snapshot
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container, [data-testid=\"job-card\"]')].map(card => ({
  title: card.querySelector('.JobCard_title, [data-testid=\"job-title\"]')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company, [data-testid=\"company-name\"]')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location, [data-testid=\"location\"]')?.textContent?.trim(),
  link: card.querySelector('a')?.href,
  scraped_at: new Date().toISOString()
}))
" | jq -s 'add | unique_by(.link)' > jobs_merged.json

# 7. 상세 페이지 순회 (에러 핸들링 포함)
for i in e15 e16 e17; do
  if playwright-cli click $i 2>/dev/null; then
    sleep 1
    playwright-cli snapshot
    playwright-cli eval "document.querySelector('.job-description, [data-testid=\"description\"]')?.textContent" >> details.txt
    playwright-cli go-back
    sleep 2
  else
    echo "Failed to click $i, skipping..."
  fi
done

# 8. 브라우저 종료
playwright-cli close

# 9. 결과 요약
echo "Scraped $(jq 'length' jobs_merged.json) unique jobs"
```

## Debugging & Troubleshooting

### 콘솔 로그 확인
```bash
playwright-cli console
playwright-cli console warning  # warning 레벨 이상만
```

### 네트워크 요청 확인
```bash
playwright-cli network
```

### 스크린샷 캡처
```bash
playwright-cli screenshot
playwright-cli screenshot --filename=error-page.png
```

### 트레이싱 (문제 분석)
```bash
playwright-cli tracing-start
# ... 작업 수행 ...
playwright-cli tracing-stop
```
