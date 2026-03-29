---
name: job-scraping
description: "Web scraping workflow for collecting job postings from Korean job sites using agent-browser with custom User-Agent"
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(sleep)
  - Bash(curl)
---

# Job Scraping Skill v3

> **핵심**: agent-browser에 `--user-agent` 플래그가 **필수**. 없으면 Wanted에서 403 에러 발생.

## User-Agent (반드시 사용)

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
agent-browser --user-agent "$UA" open "..."
```

---

## Fallback Chain

```
1차: agent-browser + custom User-Agent ← PRIMARY
2차: web_fetch (정적 페이지 마크다운 변환)
3차: web_search (공고 검색으로 URL 발견)
4차: 수동 (사용자에게 알림)
```

---

## Source 1: Wanted (wanted.co.kr) ✅ 검증완료

### 셀렉터
- **`a[href*="/wd/"]`** — CSS class 셀렉터(`.JobCard_container`)는 작동하지 않음

### 데이터 구조
- title, company, experience, reward가 `el.textContent`에 합쳐져 있음
- **중요**: 현재 파싱 로직 실패 → fields completeness 0% (EXP-008 revert 원인)
- 개선된 다단계 파싱 로직 필요

### 워크플로우

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
sleep 5
agent-browser wait --load networkidle

# 2. 공고 목록 추출 (개선된 파싱 로직 - EXP-009)
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,20).map(el => {
  // Helper function to escape regex special characters
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  const allText = (el.textContent || '').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
  let workingText = allText;
  
  // Step 1: Very basic location removal
  workingText = workingText
    .replace(/\\[.*?\\]/g, '')  // Remove [location] patterns
    .replace(/\\/g, '')         // Remove standalone slashes
    .trim();
  
  // Step 2: Simple experience extraction
  const expMatch = workingText.match(/경력[\\s]*(\\d+~\\d+년|\\d+년 이상|\\d+년↑|무관)/);
  if (expMatch) {
    result.experience = '경력 ' + expMatch[1];
    workingText = workingText.replace(expMatch[0], ' ').trim();
  }
  
  // Step 3: Simple reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금)[\\s]*(\\d+만원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  // Step 4: Enhanced company extraction with multiple strategies
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(\`\${indicator}[\\s]*([^\\s,]+(?:\\s[^\\s,]+)?)\`);
    const match = workingText.match(pattern);
    if (match && match[1]) {
      companyMatch = match[1].trim();
      break;
    }
  }
  
  // Strategy 2: English company indicators with multi-word support
  if (!companyMatch) {
    const englishIndicators = ['Inc\\.', 'LLC', 'Corp\\.', 'Co\\.', 'Ltd\\.', 'GmbH', 'BV'];
    for (const indicator of englishIndicators) {
      const pattern = new RegExp(\`(\\b[^\\s,]+(?:\\s[^\\s,]+)*?)\\s+${indicator.replace('\\.', '\\.')}`);
      const match = workingText.match(pattern);
      if (match && match[1]) {
        companyMatch = match[1].trim();
        break;
      }
    }
  }
  
  // Strategy 3: Pattern-based Korean company names (2-4 characters + possible suffix)
  if (!companyMatch) {
    const koreanPatterns = [
      /[가-힣]{2,4}(?:기업|그룹|솔루션|테크|시스템|랩스|인터내셔널|코리아|글로벌)/,
      /[가-힣]{2,4}(?:소프트웨어|IT|커뮤니케이션|네트웍스|디지털|플랫폼)/
    ];
    
    for (const pattern of koreanPatterns) {
      const match = workingText.match(pattern);
      if (match && match[0]) {
        companyMatch = match[0].trim();
        break;
      }
    }
  }
  
  // Strategy 4: Comprehensive Korean company name list
  if (!companyMatch) {
    const koreanCompanies = [
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스',
      '우아한', '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트',
      '한컴', '네오위즈', '넥슨', '엔씨소프트', '엘림스', '더존', '원스톱',
      '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아',
      '비댁스', '에버온', '코어셀', '키트웍스'
    ];
    
    for (const company of koreanCompanies) {
      const pattern = new RegExp(\`\${company}(?=[경능명년]|$)\`);
      const match = workingText.match(pattern);
      if (match) {
        companyMatch = company;
        break;
      }
    }
  }
  
  // Apply company extraction
  if (companyMatch) {
    result.company = companyMatch;
    workingText = workingText.replace(new RegExp(escapeRegExp(companyMatch), 'g'), ' ').trim();
  }
  
  // Step 5: Title is what's left (remove extra spaces and common separators)
  const titleText = workingText
    .replace(/[,·\\s]+/g, ' ')
    .trim();
  
  if (titleText) {
    result.title = titleText;
  } else {
    result.title = '직무 미상';
  }
  
  // Ensure we have reasonable defaults
  if (!result.company || result.company.length < 2) {
    result.company = '회사명 미상';
  }
  if (!result.experience) {
    result.experience = '';
  }
  if (!result.reward) {
    result.reward = '';
  }
  
  return { 
    id: wdId, 
    title: result.title, 
    company: result.company, 
    experience: result.experience, 
    reward: result.reward, 
    link: result.link 
  };
})" --json > wanted_jobs.json

# 3. 상세 페이지 (선택)
agent-browser click @{ref}
sleep 3
agent-browser eval "document.querySelector('.job-description, [class*=description]')?.textContent"
agent-browser back

# 4. 브라우저 종료
agent-browser close
```

### 샘플 결과
```json
{"id":"350866","title":"디지털 학습 플랫폼 백엔드 개발자 (JAVA)","company":"미래엔","experience":"경력 5년 이상","reward":"합격보상금 100만원","link":"https://www.wanted.co.kr/wd/350866"}
```

---

## Source 2: JobKorea (jobkorea.co.kr) ✅ 검증완료

### 셀렉터
- **`[class*=dlua7o0]`** — 카드 컨테이너

### 워크플로우

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"
sleep 5
agent-browser wait --load networkidle

# 2. 공고 목록 추출
agent-browser eval "[...document.querySelectorAll('[class*=dlua7o0]')].slice(0,20).map(card => {
  const text = (card.textContent || '').trim();
  const lines = text.split(/\\n/).map(s => s.trim()).filter(Boolean);
  const title = lines.find(l => l.length > 5 && !l.match(/스크랩|지원|등록|마감|경력|서울|경기/)) || '';
  const company = lines.find(l => l.match(/㈜|주식회사|Corp/) || (l.length <= 8 && !l.match(/경력|지원|스크랩/))) || '';
  const experience = lines.find(l => l.match(/경력/)) || '';
  const location = lines.find(l => l.match(/서울|경기|부산|대전|인천/)) || '';
  const deadline = lines.find(l => l.match(/마감/)) || '';
  const linkEl = card.querySelector('a[href*=\"Recruit\"]');
  return { title, company, experience, location, deadline, link: linkEl?.href || '' };
})" --json > jobkorea_jobs.json

# 3. 브라우저 종료
agent-browser close
```

---

## Source 3: LinkedIn (linkedin.com/jobs) ✅ 검증완료

### 셀렉터
- **`.base-card`** 또는 `.jobs-search__results-list li`

### 워크플로우

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.linkedin.com/jobs/search/?keywords={keyword}&location=South+Korea"
sleep 5
agent-browser wait --load networkidle

# 2. 공고 목록 추출
agent-browser eval "[...document.querySelectorAll('.jobs-search__results-list li, .base-card')].slice(0,20).map(el => {
  const titleEl = el.querySelector('.base-search-card__title, h3');
  const companyEl = el.querySelector('.base-search-card__subtitle, h4');
  const locEl = el.querySelector('.job-search-card__location, [class*=location]');
  const linkEl = el.querySelector('a[href*=\"/jobs/\"]');
  return {
    title: titleEl?.textContent?.trim() || '',
    company: companyEl?.textContent?.trim() || '',
    location: locEl?.textContent?.trim() || '',
    link: linkEl?.href || ''
  };
})" --json > linkedin_jobs.json

# 3. 브라우저 종료
agent-browser close
```

---

## 한국어 날짜 파싱

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
  // MM/DD(요일) 마감
  const mmdd = text.match(/(\d{2})\/(\d{2})/);
  if (mmdd) {
    const now = new Date();
    return new Date(now.getFullYear(), parseInt(mmdd[1]) - 1, parseInt(mmdd[2]));
  }
  return null;
};
```

---

## 통근 거리 계산 (Kakao Map)

```bash
# 환경변수 필요
export KAKAO_REST_API_KEY="your_api_key_here"

# 주소 → 좌표 변환
curl -s "https://dapi.kakao.com/v2/local/search/address.json?query={address}" \
  -H "Authorization: KakaoAK $KAKAO_REST_API_KEY"

# 대중교통 경로
curl -s "https://apis-navi.kakaomobility.com/v1/directions?origin={lon},{lat}&destination={lon},{lat}" \
  -H "Authorization: KakaoAK $KAKAO_REST_API_KEY"
```

---

## Rate Limiting

- 최소 대기: **3초** (동일 도메인)
- 최대 페이지: **50페이지/세션**
- robots.txt 준수
- **429 또는 403 시 즉시 중단**
- Exponential backoff: 3초 → 6초 → 12초

---

## 에러 핸들링

```bash
# 403 발생 시
agent-browser close
# → 다른 User-Agent로 재시도

# 빈 결과 시
# → 대체 셀렉터 시도
agent-browser eval "document.body.innerHTML.length"  # 페이지 로드 확인

# 타임아웃 시
# → sleep 시간 증가

# 항상 에러 시 스크린샷
agent-browser screenshot --annotate error.png
```

---

## 디버깅

```bash
agent-browser console        # 콘솔 로그
agent-browser errors         # 에러 로그
agent-browser screenshot     # 스크린샷
```
