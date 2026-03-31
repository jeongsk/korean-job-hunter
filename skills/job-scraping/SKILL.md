---
name: job-scraping
description: "Web scraping workflow for collecting job postings from Korean job sites using agent-browser with custom User-Agent"
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(sleep)
  - Bash(curl)
---

# Job Scraping Skill v4.0 (EXP-045: Cross-Source Dedup)

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
  // EXP-037: Extract company from raw text before pre-segmentation
  let rawCompany = null;
  const rcm = allText.match(/([가-힣]+(?:\\\\s*\\\\([^)]+\\\\))?)경력/);
  if (rcm) { rawCompany = rcm[1].replace(/^(개발자|엔지니어|매니저|디자이너|기획자|분석가|리더|컨설턴트|전문가|디렉터|과장|차장|부장|대리|사원|인턴|PD|PM|CTO|CEO|COO)/, ''); if (rawCompany.length < 2) rawCompany = null; }
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
  const kInd = ['㈜','주식회사','유한회사','(주)'];
  for (const ind of kInd) { const m = t.match(new RegExp(escapeRegExp(ind)+'\\\\s*([^\\\\s,]+(?:\\\\s[^\\\\s,]+)?)')); if (m) { cm = m[0]; break; } }
  if (!cm) {
    const known = ['카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자','마이플레이스','한컴','네오위즈','넥슨','엔씨소프트','키움','미래엔','웨이브릿지','트리노드','페칭','비댁스','코어셀','키트웍스','더존','쿠팡','111퍼센트','스패이드','인터엑스','윙잇','에이엑스'];
    for (const c of known) { if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; } }
  }
  // EXP-037: Fallback — number+Korean company names (e.g., 111퍼센트)
  if (!cm) { const nk = t.match(/(\d+[가-힣]{2,}(?:\([A-Za-z0-9]+\))?)$/); if (nk) cm = nk[1]; }
  // EXP-038: Fallback — camelCase English company name (e.g., DeveloperVingle → Vingle)
  if (!cm) { const cc = t.match(/([a-z])([A-Z][a-z]+)\s*$/); if (cc) cm = t.substring(cc.index + 1).trim(); }
  if (cm) { r.company = cm.replace(/^[\\s㈜]+/,'').replace(/^\\(주\\)\\s*/,''); if (!cm.includes('㈜') && !cm.includes('주식회사') && !cm.includes('(주)')) t = t.replace(new RegExp(escapeRegExp(cm),'g'),' '); }
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
  
  // JobKorea positional parsing (EXP-035): classify → extract in order
  return cards.slice(0,20).map(card => {
    const text = (card.textContent || '').trim();
    const lines = text.split(/\\n/).map(s => s.trim()).filter(Boolean);
    const cityP = /(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천|성남|중구)/;
    const prefixP = /^(㈜|\\(주\\)|주식회사)/;
    const uiNoise = /스크랩\\d*|지원\\d*명|등록/;
    let title='',company='',experience='',location='',deadline='';
    // Classify
    const cls = lines.map((l,i)=> {
      if (/마감/.test(l)) return {t:'dl',l,i};
      if (/^신입$/.test(l)) return {t:'exp',l,i};
      if (/^경력/.test(l)) { const r=l.replace(/^경력\\s*/,''); if(!r||/^무관/.test(r)||/^\\d/.test(r)) return {t:'exp',l,i}; }
      if (uiNoise.test(l)) return {t:'noise',l,i};
      return {t:'unk',l,i};
    });
    const dl=cls.find(c=>c.t==='dl'); if(dl) deadline=dl.l;
    const ex=cls.find(c=>c.t==='exp'); if(ex) experience=ex.l;
    const unks=cls.filter(c=>c.t==='unk');
    // Company by prefix
    let ci=-1;
    for(const u of unks) { if(prefixP.test(u.l)){company=u.l.replace(prefixP,'').trim();ci=u.i;break;} }
    // Location: last city-matching unknown (handles company-name-is-city edge)
    const cm=unks.filter(u=>u.i!==ci&&cityP.test(u.l));
    let li=-1;
    if(cm.length){const e=cm[cm.length-1];location=e.l;li=e.i;if(!company&&cm.length>=2){company=cm[0].l;ci=cm[0].i;}}
    // Company fallback: positional (first unknown after title)
    if(!company){for(const u of unks){if(u.i!==li){if(!title)title=u.l;else{company=u.l;ci=u.i;break;}}}}
    // Title: first unknown not company/location
    if(!title){for(const u of unks){if(u.i!==ci&&u.i!==li){title=u.l;break;}}}
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

# ⚠️ Authwall detection: LinkedIn may redirect to /authwall (login wall).
# If current URL contains "/authwall", close browser, wait 10s, retry with fresh session.
# After 2 authwall redirects, skip LinkedIn and report authwall error.
agent-browser eval "window.location.href" --json
# If href contains "/authwall" → retry or skip.

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

### LinkedIn 카드 후처리 (v3.7)

LinkedIn 카드에서 추출 후 추가 파싱 필요:

```javascript
// Location normalization: strip country, map English cities to Korean
const normalizeLocation = (loc) => {
  if (!loc) return '';
  let l = loc.replace(/,?\s*South Korea\s*$/i, '').replace(/,?\s*대한민국\s*$/, '');
  const cities = [['Seoul','서울'],['Busan','부산'],['Suwon','수원'],['Pangyo','판교'],
    ['Incheon','인천'],['Daegu','대구'],['Daejeon','대전'],['Gwangju','광주'],['Ulsan','울산'],['Jeju','제주']];
  for (const [en, kr] of cities) { if (new RegExp('\\b'+en+'\\b','i').test(l)) { l = l.replace(new RegExp('\\b'+en+'\\b','i'), kr); break; } }
  return l.replace(/,?\s*Gyeonggi-do/i,' 경기도').replace(/,?\s*Gyeonggi/i,' 경기도').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
};
```

---

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

## Culture Keyword Extraction (EXP-043)

Job listings contain cultural signals that feed into the matching algorithm's culture component (15% weight). Extract from full job description text (상세 페이지) or listing snippet:

### Culture Keywords (Korean + English)
| Category | Keywords |
|----------|----------|
| **innovative** | 혁신, 도전, 창의, 크리에이티브, creative, innovation, challenge, 새로운 |
| **collaborative** | 협업, 팀워크, 소통, 협력, collaborat*, teamwork, partnership, 함께, 공동 |
| **fast_paced** | 빠른, agile, 실시간, 스타트업, fast-paced, rapid, 민첩 |
| **structured** | 체계, 프로세스, systematic, process, 표준화, QA, 품질관리 |
| **learning_focused** | 성장, 학습, learning, growth, 교육, 워크샵, 컨퍼런스, 스터디, 멘토 |
| **autonomous** | 자율, 독립, autonomous, independent, 자기주도, 오너십, ownership, 주도적 |

### Extraction (JavaScript)
```javascript
const CULTURE_PATTERNS = {
  innovative: /(혁신|도전|창의|크리에이티브|creative|innovation|challenge|새로운)/i,
  collaborative: /(협업|팀워크|소통|협력|collaborat|teamwork|communication|partnership|함께|공동)/i,
  fast_paced: /(빠른|agile|실시간|스타트업|fast[\s-]?paced|rapid|민첩)/i,
  structured: /(체계|프로세스|systematic|process|표준화|qa|품질관리)/i,
  learning_focused: /(성장|학습|learning|growth|교육|워크샵|컨퍼런스|스터디|멘토)/i,
  autonomous: /(자율|독립|autonomous|independent|자기주도|오너십|ownership|주도적)/i,
};
function extractCultureKeywords(text) {
  if (!text) return [];
  const kw = [];
  for (const [key, re] of Object.entries(CULTURE_PATTERNS)) {
    if (re.test(text)) kw.push(key);
  }
  return kw;
}
```

Extract from: (1) 상세 페이지 `.job-description` text (best), (2) listing card textContent (partial), (3) company about page. Store as `culture_keywords` field (JSON array) in the jobs table.

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

## Cross-Source Deduplication (EXP-045)

Same job posted on Wanted, JobKorea, LinkedIn has different URLs. Fuzzy matching detects duplicates:

### Algorithm
1. **Company match**: Normalize both company names (strip `(주)`, `㈜`, `주식회사`, case-insensitive). Must match exactly or one contains the other.
2. **Title similarity**: Normalize titles, compute token-based Jaccard with Korean↔English equivalents:
   - 프론트엔드↔frontend, 백엔드↔backend, 풀스택↔fullstack, 개발자↔developer, 엔지니어↔engineer, 데이터↔data, 데브옵스↔devops, etc.
3. **Threshold**: Same company + title similarity ≥ 0.6 → duplicate

### When merging duplicates, keep the entry with:
- Most complete fields (prefer the one with salary, deadline, culture_keywords)
- If tied: prefer Wanted (usually richer data)

```javascript
// Korean↔English title equivalents for token matching
const koEnMap = {
  '프론트엔드': 'frontend', '백엔드': 'backend', '풀스택': 'fullstack',
  '개발자': 'developer', '엔지니어': 'engineer', '데이터': 'data',
  '분석가': 'analyst', '디자이너': 'designer', '매니저': 'manager',
  '데브옵스': 'devops', '모바일': 'mobile', '인프라': 'infrastructure',
};
```

### SQL: Mark duplicates after scraping
```sql
-- Find potential duplicates (run after scraping)
SELECT a.id, a.source, a.title, a.company, b.id as dup_id, b.source as dup_source
FROM jobs a JOIN jobs b ON a.id < b.id
WHERE replace(replace(replace(lower(a.company),'(주)',''),'㈜',''),'주식회사','')
    = replace(replace(replace(lower(b.company),'(주)',''),'㈜',''),'주식회사','');
```

---

## 디버깅

```bash
agent-browser console        # 콘솔 로그
agent-browser errors         # 에러 로그
agent-browser screenshot     # 스크린샷
```
