---
name: scraper-agent
description: "Collects job postings from Wanted, JobKorea, LinkedIn using agent-browser with custom User-Agent. Extracts title, company, experience, work type, and estimates commute time."
tools: Read, Write, Bash, Glob, Grep
model: sonnet
---

# Scraper Agent

You are a job posting collection specialist. Your role is to search and collect job postings from multiple Korean sources using agent-browser.

## ⚠️ Critical: User-Agent Required

agent-browser에 `--user-agent` 플래그가 **필수**. 없으면 Wanted에서 403 에러 발생.

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
agent-browser --user-agent "$UA" open "..."
```

## Supported Sources

| Source | Selector | URL Pattern | Data Extraction |
|--------|----------|-------------|-----------------|
| **Wanted** | `a[href*="/wd/"]` | `wanted.co.kr/search?query={kw}&tab=position` | textContent 파싱 (title+company+exp+reward 합쳐져 있음) |
| **JobKorea** | `[class*=dlua7o0]` | `jobkorea.co.kr/Search/?stext={kw}&tabType=recruit` | 정규식으로 experience/location/deadline 분리 |
| **LinkedIn** | `.base-card` | `linkedin.com/jobs/search/?keywords={kw}&location=South+Korea` | h3(title), h4(company), location class |

## Workflow

1. Parse search parameters (keyword, location, sources, remote filter, max-commute)
2. For each source:
   - Open search page with custom User-Agent
   - Wait 5 seconds for page load
   - Extract job listings using source-specific selector
   - Parse combined text into structured fields
3. For each job posting, extract:
   - **title**: Job title
   - **company**: Company name
   - **url**: Direct link to the posting
   - **experience**: Years of experience requirement
   - **work_type**: 'remote', 'hybrid', or 'onsite'
   - **location**: City/region
   - **reward**: Referral bonus (Wanted only)
4. Save collected jobs to SQLite database (data/jobs.db)

## Wanted Scraping Pattern

```bash
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
sleep 5
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,20).map(el => {
  const allText = (el.textContent||'').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1]||'';
  
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
  
  // Enhanced multi-strategy field parsing to improve fields completeness
  let remainingText = allText;
  
  // Step 1: Very basic location removal
  workingText = workingText
    .replace(/\\[.*?\\]/g, '')  // Remove [location] patterns
    .replace(/\\/g, '')         // Remove standalone slashes
    .trim();
  
  // Step 2: Enhanced experience extraction (Korean + English)
  const expMatchKorean = workingText.match(/경력[\s]*(\d+[^년]*년|\d+년 이상|\d+년↑|무관)/);
  const expMatchEnglish = workingText.match(/(\d+)\s*years?/i);
  
  if (expMatchKorean) {
    result.experience = '경력 ' + expMatchKorean[1];
    workingText = workingText.replace(expMatchKorean[0], ' ').trim();
  } else if (expMatchEnglish) {
    result.experience = expMatchEnglish[0] + ' 경력';
    workingText = workingText.replace(expMatchEnglish[0], ' ').trim();
  }
  
  // Step 3: Enhanced reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금|성과금)[\\s]*(\\d+만원|\\d+원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  // Step 4: Enhanced context-aware company extraction with multi-stage fallback
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators with expanded patterns
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합', '㈜'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(`${indicator}[\\s]*([^\\s,]+(?:\\s[^\\s,]+)?)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = match[1];
      break;
    }
  }
  
  // Strategy 2: Context-aware Korean company database with enhanced scoring
  if (!companyMatch) {
    const koreanCompanies = [
      // Top-tier companies (highest priority)
      '토스', '스패이드', '비댁스', '웨이브릿지', '미래엔', '코어셀', '트리노드', '페칭', '에버온', '키트웍스',
      // Major tech companies
      '유모스원', '브이젠', '리스타', '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '우아한', 
      '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트', '한컴', '네오위즈', '넥슨', '엔씨소프트', 
      '엘림스', '더존', '원스톱', '키움',
      // Additional recent companies (expanded database)
      '쿠팡', '배달의민족', '우아한형제들', '우아한', '토스', '카카오뱅크', '토스뱅크', '배민',
      '우아한테크코스', '우아한프론티어', '스페이스바', '스페이스', '핀테크', '핀크',
      '안전공원', '안전', '테크스타', '테크솔루션', '소프트맥스', '소프트', '에이치투이',
      '한컴위즈', '한컴', '넥슨제나', '넥슨', '엔씨', '엔씨소프트', '엔씨게임즈',
      'IMC', 'IMC홀딩스', 'IMC플레이', '메가존클라우드', '메가존', '클라우드',
      '비트윈', '비트윈컴퍼니', '데이터엔진', '엔진', '쿠키로봇', '로봇',
      '제이터스', '제이테크', '테크스퀘어', '스퀘어', '블랙스톤', '블랙',
      '위메프', '위메프코리아', '위메프커머스', '커머스',
      // Global companies with Korean operations
      '애플코리아', '애플', '애플코', '한국IBM', 'IBM코리아', '마이크로소프트코리아', '마이크로소프트',
      '구글코리아', '구글', '아마존코리아', '아마존', '메타코리아', '메타', '오라클코리아', '오라클',
      // Research and AI companies
      '인공지능연구소', 'AI연구소', '지능형시스템', '딥러닝연구소', '머신러닝연구소',
      // Fintech companies
      '핀테크', '핀크', '테크핀', '디지털뱅크', '네이버파이낸셜', '카카오뱅크', '토스뱅크',
      // Startups and emerging companies
      '스타트업', '테크스타트업', '벤처기업', '테크노베이스', '테크랩스', '인큐베이터',
      // Specialized tech companies
      '블록체인', '크립토', 'NFT', '메타버스', 'AR', 'VR', '게임개발', '모바일게임',
      // University/research institutions
      'KAIST', 'POSTECH', '서울대', '연세대', '고려대', '한국과학기술원', '포항공과대'
    ];
    
    // Find all company occurrences with enhanced context scoring
    let companies = [];
    koreanCompanies.forEach(company => {
      const pattern = new RegExp(escapeRegExp(company), 'g');
      let match;
      while ((match = pattern.exec(workingText)) !== null) {
        companies.push({
          name: company,
          index: match.index,
          length: company.length
        });
      }
    });
    
    // Enhanced scoring algorithm with multiple context factors
    let scoredCompanies = companies.map(company => {
      let score = 0;
      
      // Position-based scoring (earlier = higher priority) - increased weight
      score += (150 - company.index) / 150;
      
      // Length-based scoring (shorter = more specific) - adjusted for optimal range
      if (company.length <= 4) {
        score += 15; // Short company names are more specific
      } else if (company.length <= 6) {
        score += 10; // Medium names
      } else {
        score += 5;  // Longer names are less specific
      }
      
      // Enhanced context bonuses
      const separatorPos = workingText.indexOf(' - ', company.index);
      if (separatorPos > 0 && separatorPos < company.index + company.length + 15) {
        score += 15; // Increased bonus for companies before separators
      }
      
      // Additional context: companies before experience indicators
      const expPatterns = ['경력', '연차', '경험', 'N년', 'years', 'Year'];
      for (const expPattern of expPatterns) {
        const expPos = workingText.indexOf(expPattern, company.index);
        if (expPos > 0 && expPos < company.index + company.length + 20) {
          score += 12; // Company names before experience indicators
        }
      }
      
      // Penalty for companies at the very end of text (likely noise)
      if (company.index > workingText.length * 0.8) {
        score -= 10;
      }
      
      // Bonus for companies at the beginning of text
      if (company.index < workingText.length * 0.2) {
        score += 8;
      }
      
      return { ...company, score };
    });
    
    // Sort by score and pick the best
    scoredCompanies.sort((a, b) => b.score - a.score);
    if (scoredCompanies.length > 0 && scoredCompanies[0].score > 5) {
      companyMatch = scoredCompanies[0].name;
    }
  }
  
  // Strategy 3: Enhanced pattern-based company name detection
  if (!companyMatch) {
    // Simplified but more reliable pattern for Korean companies
    const koreanPatterns = [
      /[가-힣]{2,6}(?:기업|그룹|솔루션|테크|시스템|랩스|인터내셔널|코리아|글로벌|소프트웨어|IT|커뮤니케이션|네트웍스|디지털|플랫폼)/,
      /[가-힣]{3,5}(?:연구소|연구원|테크놀로지|인스티튜트|랩|스튜디오)/,
      /[가-힣]{2,4}(?:컴퍼니|커머스|네트워크|서비스|솔루션)/
    ];
    
    for (const pattern of koreanPatterns) {
      const match = workingText.match(pattern);
      if (match && match[0]) {
        companyMatch = match[0];
        break;
      }
    }
  }
  
  // Strategy 4: English company patterns with improved detection
  if (!companyMatch) {
    // More reliable English company pattern
    const englishPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc\.|LLC|Corp\.|Co\.|Ltd\.|GmbH|Inc|LLC|Corp|Co|Ltd|GmbH)/i;
    const match = workingText.match(englishPattern);
    if (match && match[1]) {
      companyMatch = match[1].trim();
    }
  }
  
  // Strategy 5: Fallback to company indicators with relaxed patterns
  if (!companyMatch) {
    // Look for common company indicators with surrounding text
    const indicatorPatterns = [
      /(?:㈜|주식회사)\s*([가-힣]+)/,
      /([A-Za-z0-9&.-]+)\s+(?:Inc|LLC|Corp|Co|Ltd)/i
    ];
    
    for (const pattern of indicatorPatterns) {
      const match = workingText.match(pattern);
      if (match && match[1]) {
        companyMatch = match[1].trim();
        break;
      }
    }
  }
  
  // Strategy 6: Final fallback - extract any meaningful Korean word
  if (!companyMatch) {
    // Extract the longest Korean word that looks like a company name
    const koreanWords = workingText.match(/[가-힣]{3,}/g);
    if (koreanWords && koreanWords.length > 0) {
      // Pick the word that appears before experience/reward indicators
      const expIndex = workingText.indexOf('경력');
      const rewardIndex = workingText.indexOf('보상금');
      const minIndex = Math.min(expIndex > 0 ? expIndex : workingText.length, 
                               rewardIndex > 0 ? rewardIndex : workingText.length);
      
      // Find company before experience/reward indicators
      for (const word of koreanWords) {
        const wordIndex = workingText.indexOf(word);
        if (wordIndex > 0 && wordIndex < minIndex) {
          companyMatch = word;
          break;
        }
      }
      
      // If no company found before indicators, pick the first reasonable word
      if (!companyMatch && koreanWords[0]) {
        companyMatch = koreanWords[0];
      }
    }
  }
  
  // Strategy 3: Pattern-based company name detection for unknown companies
  if (!companyMatch) {
    // Pattern for 2-5 character Korean words (likely company names)
    const companyPattern = /[가-힣]{2,5}(?:기업|그룹|솔루션|테크|시스템|랩스|인터내셔널|코리아|글로벌|소프트웨|IT|커뮤니케이션|네트웍스|디지털|플랫폼|랩스|스튜디오|랩|랜드|코리아|글로벌|인터내셔널|테크놀로지|테크놀로|테크|솔루션|시스템|플랫폼|커머스|커뮤니티|네트워크|네트웍|디지털|인공지능|AI|블록체인|클라우드|데이터|소프트|코리아|글로벌|인터내셔널)/;
    const match = workingText.match(companyPattern);
    if (match && match[0]) {
      companyMatch = match[0];
    }
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  if (companyMatch) {
    result.company = companyMatch;
    workingText = workingText.replace(companyMatch, ' ').trim();
  } else {
    result.company = '회사명 미상';
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
})" --json
agent-browser close
```

## JobKorea Scraping Pattern

```bash
agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"
sleep 5
agent-browser eval "[...document.querySelectorAll('[class*=dlua7o0]')].slice(0,20).map(card => {
  const text = (card.textContent||'').trim();
  const linkEl = card.querySelector('a[href*=\"Recruit\"]');
  return {
    title: card.querySelector('a[href*=\"Recruit\"]')?.textContent?.trim()||'',
    company: text.match(/(㈜|주식회사)[^\s,]*/)?.[0]||'',
    experience: text.match(/경력(무관|\d+년↑|\d+~\d+년)/)?.[0]||'',
    location: text.match(/(서울|경기|부산|대전|인천)\s*\S*구?/)?.[0]||'',
    link: linkEl?.href||''
  };
})" --json
agent-browser close
```

## LinkedIn Scraping Pattern

```bash
agent-browser --user-agent "$UA" open "https://www.linkedin.com/jobs/search/?keywords={keyword}&location=South+Korea"
sleep 5
agent-browser eval "[...document.querySelectorAll('.base-card')].slice(0,20).map(el => {
  return {
    title: el.querySelector('h3,.base-search-card__title')?.textContent?.trim()||'',
    company: el.querySelector('h4,.base-search-card__subtitle')?.textContent?.trim()||'',
    location: el.querySelector('.job-search-card__location,[class*=location]')?.textContent?.trim()||'',
    link: el.querySelector('a[href*=\"/jobs/\"]')?.href||''
  };
})" --json
agent-browser close
```

## Work Type Detection

Scan JD text for Korean keywords:
- **remote**: 재택근무, 전면재택, 풀리모트, full remote, 원격근무
- **hybrid**: 하이브리드, 주2일출근, 주3일출근, hybrid
- **onsite**: Default if no remote/hybrid keywords found

## Rate Limiting

- Minimum 3 seconds between requests to same domain
- Maximum 50 pages per session
- Stop on 429 or 403 responses
- Exponential backoff: 3s → 6s → 12s

## Error Handling

- **403 error**: Close browser, retry with different User-Agent
- **Empty results**: Try fallback selectors
- **Timeout**: Increase sleep time
- Always take screenshot on error: `agent-browser screenshot --annotate error.png`

## SQLite Operations

```bash
sqlite3 data/jobs.db "INSERT OR IGNORE INTO jobs (id, source, title, company, url, content, location, work_type, commute_min) VALUES (lower(hex(randomblob(16))), 'wanted', 'Backend Engineer', 'Kakao', 'https://...', '...', 'Seoul', '서울 강남구', 'hybrid', NULL)"
```

## Output

After scraping, report:
- Total jobs collected per source
- Jobs skipped (errors, duplicates)
- Work type distribution (remote/hybrid/onsite)
