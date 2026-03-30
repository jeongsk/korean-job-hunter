---
name: job-scraping
description: "Web scraping workflow for collecting job postings from Korean job sites using agent-browser with custom User-Agent"
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(sleep)
  - Bash(curl)
---

# Job Scraping Skill v3.2

> **핵심**: agent-browser에 `--user-agent` 플래그가 **필수**. 없으면 Wanted에서 403 에러 발생.

## Work Type + Location Detection (EXP-025)

Wanted listing text에 재택/하이브리드/지역 정보가 포함된 경우 파싱:

### Work Type 키워드
- **remote**: 전면재택, 재택근무, 풀리모트, full remote, 원격근무, fully remote, 100% remote
- **hybrid**: 하이브리드, 주N일출근, hybrid, 주N일 출근  
- **onsite**: 위 키워드 없으면 기본값

감지 후 키워드를 working text에서 제거 (title 오염 방지).

### Location 추출
1. 브래킷에서 추출: `[서울 영등포구]`, `[판교]`, `[부산/...]`
   - city + district 패턴: `서울 영등포구`, `경기 분당`
   - mixed bracket도 처리: `[부산/경력 5년]` → location: `부산`
2. 브래킷 없으면 bare text에서 city/district keyword 검색 후 제거

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
- EXP-023 pre-segmentation, EXP-025 work_type/location, EXP-031 eval sync 적용됨

### 워크플로우

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
sleep 5
agent-browser wait --load networkidle

# 2. 공고 목록 추출 (EXP-031: pre-segmentation + work_type + location)
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,20).map(el => {
  function escapeRegExp(s) { return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); }
  const allText = (el.textContent || '').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  let r = { id: wdId, title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '', link: link };
  let t = allText;
  // Location from brackets (before removal)
  const cities = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천)';
  const bm = t.match(new RegExp('\\\\[.*?' + cities + '.*?\\\\]'));
  if (bm) { const lm = bm[0].replace(/[\\[\\]]/g,'').match(new RegExp(cities+'(?:\\\\s+[가-힣]{2,3}(?:구|시|군|동))?)')); if (lm) r.location = lm[0].trim(); }
  // Work type detection (EXP-025)
  if (/전면재택|재택근무|풀리모트|full\\s*remote|원격근무|fully\\s*remote/i.test(t)) r.work_type = 'remote';
  else if (/하이브리드|주\\\\d일\\\\s*출근|hybrid/i.test(t)) r.work_type = 'hybrid';
  t = t.replace(/전면재택|재택근무|풀리모트|원격근무|fully?\\s*remote|하이브리드|주\\\\d일\\\\s*출근|hybrid/gi, ' ');
  // Pre-segmentation for concatenated text (EXP-023)
  t = t.replace(/(경력)/g, ' \$1').replace(/(합격|보상금|성과금)/g, ' \$1').trim();
  // Remove brackets + slashes
  t = t.replace(/\\\\[.*?\\\\]/g, '').replace(/\\\\//g, ' ').trim();
  // Bare location (if not from brackets)
  if (!r.location) { const lp = t.match(new RegExp(cities+'(?:\\\\s+[가-힣]{2,3}(?:구|시|군|동))?)')); if (lp) r.location = lp[0]; }
  if (r.location) t = t.replace(new RegExp(escapeRegExp(r.location), 'g'), ' ').trim();
  // Experience (supports ~ and - ranges)
  const em = t.match(/경력[\\\\s]*(\\\\d+[~-]\\\\d+년|\\\\d+년\\\\s*이상|\\\\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' ').trim(); }
  // Reward
  const rm = t.match(/(보상금|합격금)[\\\\s]*(\\\\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' ').trim(); }
  // Noise cleanup: standalone 합격
  t = t.replace(/합격/g, ' ').trim();
  // Company extraction
  let cm = null;
  const kInd = ['㈜','주식회사','유한회사'];
  for (const ind of kInd) { const m = t.match(new RegExp(escapeRegExp(ind)+'\\\\s*([^\\\\s,]+(?:\\\\s[^\\\\s,]+)?)')); if (m) { cm = m[0]; break; } }
  if (!cm) {
    const known = ['카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자','마이플레이스','한컴','네오위즈','넥슨','엔씨소프트','키움','미래엔','웨이브릿지','트리노드','페칭','비댁스','코어셀','키트웍스','더존','쿠팡'];
    for (const c of known) { if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; } }
  }
  if (cm) { r.company = cm.replace(/^[\\s㈜]+/,''); if (!cm.includes('㈜') && !cm.includes('주식회사')) t = t.replace(new RegExp(escapeRegExp(cm),'g'),' '); }
  r.title = t.replace(/[,·\\\\s]+/g,' ').trim() || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';
  return r;
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

### 셀렉터 (Fallback Chain)

> CSS module hash 셀렉터는 사이트 업데이트 시 변경됨. Fallback chain으로 복원력 확보.

| Priority | Selector | Strategy |
|----------|----------|----------|
| 1차 | `[class*=dlua7o0]` | CSS module hash (현재 동작) |
| 2차 | `div.list-item, div[class*=recruit-item]` | 의미적 클래스명 |
| 3차 | `a[href*="Recruit/Detail"]`의 조상 `div` (3단계) | 안정적인 링크 기반 역추적 |
| 4차 | `#smScrapList li` 또는 검색 결과 컨테이너 내 `li` | 구조적 폴백 |

### 워크플로우

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"
sleep 5
agent-browser wait --load networkidle

# 2. 공고 목록 추출 (fallback selector chain 포함)
agent-browser eval "(() => {
  // Fallback selector chain
  const selectors = [
    '[class*=dlua7o0]',
    'div.list-item, div[class*=recruit-item]',
    'a[href*=\"Recruit/Detail\"]'
  ];
  
  let cards = [];
  for (const sel of selectors) {
    if (sel.includes('Recruit')) {
      // Link-based fallback: group by parent
      const links = [...document.querySelectorAll(sel)];
      const parentSet = new Map();
      links.forEach(a => {
        const parent = a.closest('li') || a.closest('div[class]') || a.parentElement;
        if (parent && !parentSet.has(parent)) parentSet.set(parent, a);
      });
      cards = [...parentSet.keys()];
    } else {
      cards = [...document.querySelectorAll(sel)];
    }
    if (cards.length > 0) break;
  }
  
  return cards.slice(0,20).map(card => {
    const text = (card.textContent || '').trim();
    const lines = text.split(/\\n/).map(s => s.trim()).filter(Boolean);
    const title = lines.find(l => l.length > 5 && !l.match(/스크랩|지원|등록|마감|경력|서울|경기/)) || '';
    const company = lines.find(l => l.match(/㈜|주식회사|Corp/) || (l.length <= 8 && !l.match(/경력|지원|스크랩/))) || '';
    const experience = lines.find(l => l.match(/경력/)) || '';
    const location = lines.find(l => l.match(/서울|경기|부산|대전|인천/)) || '';
    const deadline = lines.find(l => l.match(/마감/)) || '';
    const linkEl = card.querySelector('a[href*=\"Recruit\"]') || card.closest('a[href*=\"Recruit\"]');
    return { title, company, experience, location, deadline, link: linkEl?.href || '' };
  });
})()" --json > jobkorea_jobs.json

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
