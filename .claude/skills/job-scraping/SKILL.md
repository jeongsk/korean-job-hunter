---
name: job-scraping
description: "Web scraping workflow for collecting job postings from multiple Korean and international job sites"
allowed-tools: Bash(playwright-cli:*)
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

## Kakao Map Commute Calculation

### API Setup
- Kakao Developers: https://developers.kakao.com/
- REST API key required (set as KAKAO_REST_API_KEY env var)

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

# 2. 초기 스냅샷
playwright-cli snapshot

# 3. 모든 채용공고 추출
playwright-cli eval "
[...document.querySelectorAll('.JobCard_container')].map(card => ({
  title: card.querySelector('.JobCard_title')?.textContent?.trim(),
  company: card.querySelector('.JobCard_company')?.textContent?.trim(),
  location: card.querySelector('.JobCard_location')?.textContent?.trim(),
  link: card.querySelector('a')?.href
}))
" > jobs.json

# 4. 스크롤하여 더 많은 결과 로드
playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"
sleep 2

# 5. 추가 결과 추출
playwright-cli snapshot
playwright-cli eval "[...document.querySelectorAll('.JobCard_container')].length"

# 6. 상세 페이지 순회
for i in e15 e16 e17; do
  playwright-cli click $i
  sleep 1
  playwright-cli snapshot
  playwright-cli eval "document.querySelector('.job-description')?.textContent"
  playwright-cli go-back
  sleep 2
done

# 7. 브라우저 종료
playwright-cli close
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
