---
name: job-scraping
description: "Web scraping workflow for collecting job postings from multiple Korean and international job sites"
---

# Job Scraping Skill

## Playwright CLI Patterns

### Installation
```bash
npx playwright install chromium
```

### Basic Navigation Pattern
```javascript
const { chromium } = require('playwright');

async function scrapeJobs(url, selectors) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // Extract data using selectors
  await browser.close();
}
```

## Source-Specific Patterns

### Wanted (wanted.co.kr)
- Search URL: `https://www.wanted.co.kr/search?query={keyword}&tab=position`
- Job list selector: `.JobCard_container`
- Title: `.JobCard_title`
- Company: `.JobCard_company`
- Location: `.JobCard_location`
- Detail page: Click card to navigate, extract full JD

### Jobkorea (jobkorea.co.kr)
- Search URL: `https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit`
- Job list selector: `.list-item`
- Title: `.title`
- Company: `.name`
- Detail page: Follow link, extract `.view-content`

### LinkedIn Jobs (Public)
- Search URL: `https://www.linkedin.com/jobs/search/?keywords={keyword}&location={location}`
- Job list: `.jobs-search__results-list li`
- Title: `.base-search-card__title`
- Company: `.base-search-card__subtitle`
- Note: Only public listings, no login required

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
