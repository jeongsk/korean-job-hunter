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
2. Initialize parallel scraping sessions (enhanced v2)
3. For each source:
   - Reuse persistent browser session when available
   - Open search page with custom User-Agent
   - Apply dynamic wait based on source complexity
   - Extract job listings using source-specific selector
   - Parse combined text into structured fields
4. For each job posting, extract:
   - **title**: Job title
   - **company**: Company name
   - **url**: Direct link to the posting
   - **experience**: Years of experience requirement
   - **work_type**: 'remote', 'hybrid', or 'onsite'
   - **location**: City/region
   - **reward**: Referral bonus (Wanted only)
5. Merge results from all sources and remove duplicates
6. Save collected jobs to SQLite database (data/jobs.db)

## Wanted Scraping Pattern

```bash
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query={keyword}&tab=position"
sleep 5
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,20).map(el => {
  const allText = (el.textContent||'').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1]||'';
  
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
  
  // Step 1: Pre-segment concatenated text (Wanted often has no spaces between fields)
  let workingText = allText
    .replace(/(경력)/g, ' $1')
    .replace(/(합격|보상금|성과금)/g, ' $1')
    .replace(/\[.*?\]/g, '')
    .replace(/\//g, ' ')
    .trim();
  
  // Step 2: Enhanced experience extraction (Korean + English, supports ~ and - ranges)
  const expMatchKorean = workingText.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
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
  
  // Clean noise: standalone 합격 (not 합격금)
  workingText = workingText.replace(/\b합급?\b/g, '').replace(/합격/g, ' ').trim();
  
  // Step 4: Enhanced context-aware company extraction with multi-stage fallback
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators with expanded patterns
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
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
      '유모스원', '브이젠', '리스타', '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족',
      '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트', '한컴', '네오위즈', '넥슨', '엔씨소프트',
      '엘림스', '더존', '원스톱', '키움', '쿠팡', '카카오뱅크', '토스뱅크', '배민',
      '우아한테크코스', '우아한프론티어', '위메프', '네이버파이낸셜',
      // Global companies with Korean operations
      '애플코리아', '한국IBM', 'IBM코리아', '마이크로소프트코리아', '마이크로소프트',
      '구글코리아', '아마존코리아', '메타코리아', '오라클코리아',
      // Research institutions
      '인공지능연구소', 'AI연구소', '딥러닝연구소', '머신러닝연구소',
      'KAIST', 'POSTECH'
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

## JobKorea Scraping Pattern (Enhanced v2)

```bash
# 1. 검색 페이지 열기
agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext={keyword}&tabType=recruit"
sleep 8  # Increased wait for better loading
agent-browser wait --load networkidle

# 2. Enhanced 공고 목록 추출 with multiple selectors and better parsing
agent-browser eval "
// Primary selector for job cards
const primaryCards = [...document.querySelectorAll('[class*=dlua7o0]')];
// Fallback selectors
const fallbackCards = [...document.querySelectorAll('.job-card, .recruit-card, .list-card')];

// Combine and deduplicate cards
const allCards = [...primaryCards, ...fallbackCards].filter((card, index, self) => 
  self.findIndex(c => c === card) === index
);

const jobs = allCards.slice(0, 25).map(card => {
  const text = (card.textContent || '').trim();
  const lines = text.split(/\\n/).map(s => s.trim()).filter(Boolean);
  
  // Enhanced title extraction with multiple strategies
  const title = lines.find(l => 
    l.length > 3 && 
    !l.match(/스크랩|지원|등록|마감|경력|서울|경기|광고|배�/) &&
    !/^\d+$/.test(l)
  ) || '';
  
  // Enhanced company extraction with better patterns
  const company = lines.find(l => 
    l.match(/(㈜|주식회사|유한회사|법인|Corp|Inc|Co|Ltd)/i) ||
    (l.length >= 2 && l.length <= 10 && !l.match(/경력|지원|스크랩|마감|서울|경기|부산/))
  ) || '';
  
  // Enhanced experience extraction
  const experience = lines.find(l => l.match(/경력(무관|\\d+년↑|\\d+~\\d+년|\\d+년 이상)/)) || '';
  
  // Enhanced location extraction  
  const location = lines.find(l => l.match(/(서울|경기|부산|대전|인천|광주|대구|울산)/)) || '';
  
  // Enhanced deadline extraction
  const deadline = lines.find(l => l.match(/마감|D-\\d+|오늘|내일|\\d+월\\d+일/)) || '';
  
  // Enhanced link extraction
  const linkEl = card.querySelector('a[href*=\"Recruit\"], a[href*=\"JobDetail\"], a[href*=\"recruit\"]') || card.querySelector('a');
  const link = linkEl?.href || '';
  
  // Validate and clean job data
  const isValidJob = title && (company || location) && link;
  
  return isValidJob ? {
    title: title.trim(),
    company: company.trim() || '회사명 미상',
    experience: experience.trim() || '',
    location: location.trim() || '',
    deadline: deadline.trim() || '',
    link: link
  } : null;
}).filter(job => job !== null);

// If no valid jobs found, try simplified extraction
if (jobs.length === 0) {
  const simpleJobs = allCards.slice(0, 15).map(card => {
    const text = (card.textContent || '').trim();
    const lines = text.split(/\\n/).filter(line => line.trim());
    
    const title = lines[0] || '';
    const company = lines[1] || '';
    const link = card.querySelector('a')?.href || '';
    
    return title && company ? {
      title: title.trim(),
      company: company.trim(), 
      experience: '',
      location: '',
      deadline: '',
      link: link
    } : null;
  }).filter(job => job !== null);
  
  console.log(JSON.stringify(simpleJobs));
} else {
  console.log(JSON.stringify(jobs));
}
" --json > jobkorea_jobs.json

# 3. Validate results and retry if needed
if [ ! -s jobkorea_jobs.json ] || [ $(wc -l < jobkorea_jobs.json) -lt 1 ]; then
  echo "Retry JobKorea scraping with fallback approach..."
  agent-browser eval "
    const cards = [...document.querySelectorAll('[class*=dlua7o0], .job-card, .recruit-card')].slice(0,15);
    const jobs = cards.map(card => {
      const text = (card.textContent || '').trim();
      const lines = text.split(/\\n/).filter(line => line.trim());
      return {
        title: lines[0] || '',
        company: lines[1] || '',
        experience: '',
        location: '',
        deadline: '', 
        link: card.querySelector('a')?.href || ''
      };
    }).filter(job => job.title && job.company);
    
    console.log(JSON.stringify(jobs));
  " --json > jobkorea_jobs_fallback.json
fi

# 4. 브라우저 종료
agent-browser close
```

## LinkedIn Scraping Pattern (Enhanced v2)

```bash
agent-browser --user-agent "$UA" open "https://www.linkedin.com/jobs/search/?keywords={keyword}&location=South+Korea"
sleep 8  # Increased wait for dynamic content
agent-browser wait --load networkidle

# Enhanced LinkedIn job extraction with multiple fallback selectors
agent-browser eval "[...document.querySelectorAll('.jobs-search__results-list li, .job-card-container, .base-card')].slice(0,30).map(el => {
  // Enhanced title extraction with multiple selectors
  const titleEl = el.querySelector('h3, .base-search-card__title, .job-card__title, [data-job-title]');
  const title = titleEl?.textContent?.trim() || '';
  
  // Enhanced company extraction with multiple selectors  
  const companyEl = el.querySelector('h4, .base-search-card__subtitle, .job-card__subtitle, [data-job-company]');
  const company = companyEl?.textContent?.trim() || '';
  
  // Enhanced location extraction
  const locationEl = el.querySelector('.job-search-card__location, [class*=location], .job-card__location');
  const location = locationEl?.textContent?.trim() || '';
  
  // Enhanced link extraction
  const linkEl = el.querySelector('a[href*=\"/jobs/\"]');
  const link = linkEl?.href || '';
  
  // Only return valid job entries
  if (title && (company || location)) {
    return {
      title: title,
      company: company || 'Company not specified',
      location: location || 'Location not specified', 
      link: link
    };
  }
  return null;
}).filter(job => job !== null)" --json > linkedin_jobs.json

# Fallback: Try alternative selectors if primary fails
if [ ! -s linkedin_jobs.json ]; then
  agent-browser eval "[...document.querySelectorAll('.job-card, .job-card-container')].slice(0,30).map(el => {
    const title = el.querySelector('.job-card__title, h3')?.textContent?.trim() || '';
    const company = el.querySelector('.job-card__subtitle, h4')?.textContent?.trim() || '';
    const location = el.querySelector('.job-card__location, [class*=location]')?.textContent?.trim() || '';
    const link = el.querySelector('a[href*=\"/jobs/\"]')?.href || '';
    
    if (title && company) {
      return { title, company, location, link };
    }
    return null;
  }).filter(job => job !== null)" --json > linkedin_jobs_fallback.json
fi

agent-browser close
```

## Parallel Scraping (Enhanced v2)

```bash
# Enhanced parallel scraping with session reuse and dynamic wait management
PARALLEL_SCRAPING=true
MAX_PARALLEL=3
TOTAL_START_TIME=$(date +%s)

# Create temporary directory for parallel results
mkdir -p temp_parallel_results

# Function to scrape single source with session management
scrape_source() {
  local source=$1
  local keyword=$2
  local start_time=$(date +%s)
  local session_name="scrape_session_${source}"
  
  echo "🔄 Scraping $source..."
  
  case $source in
    "wanted")
      agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=${keyword}&tab=position"
      local wait_time=6
      ;;
    "jobkorea")
      agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext=${keyword}&tabType=recruit"
      local wait_time=8
      ;;
    "linkedin")
      agent-browser --user-agent "$UA" open "https://www.linkedin.com/jobs/search/?keywords=${keyword}&location=South+Korea"
      local wait_time=10
      ;;
  esac
  
  sleep $wait_time
  agent-browser wait --load networkidle
  
  # Source-specific extraction (simplified for parallel execution)
  case $source in
    "wanted")
      agent-browser eval "
        const jobs = [...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,20).map(el => {
          const text = (el.textContent || '').trim();
          const link = el.href;
          const wdId = link?.split('/wd/')[1] || '';
          
          // Simplified parallel parsing
          let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
          
          // Quick experience extraction
          const expMatch = text.match(/경력[\\s]*(\\d+년 이상|\\d+~\\d+년|\\d+년↑|무관)/);
          if (expMatch) {
            result.experience = '경력 ' + expMatch[1];
          }
          
          // Quick reward extraction  
          const rewardMatch = text.match(/(보상금|합격금)[\\s]*(\\d+만원)/);
          if (rewardMatch) {
            result.reward = rewardMatch[0];
          }
          
          // Quick company extraction (simplified for parallel)
          const companies = ['카카오', '네이버', '삼성', '라인', '우아한형제들', '토스', '미래엔', '웨이브릿지'];
          for (const company of companies) {
            if (text.includes(company)) {
              result.company = company;
              break;
            }
          }
          
          // Title is remaining text
          result.title = text.replace(/경력[^\\s]*[^년]*년|보상금[^\\s]*\\d+만원|${result.company}/g, '').trim();
          if (!result.title) result.title = '직무 미상';
          
          return result;
        }).filter(job => job.title && job.company);
        
        console.log(JSON.stringify(jobs));
      " --json > temp_parallel_results/${source}_jobs.json
      ;;
      
    "jobkorea")
      agent-browser eval "
        const cards = [...document.querySelectorAll('[class*=dlua7o0], .job-card')].slice(0,20);
        const jobs = cards.map(card => {
          const text = (card.textContent || '').trim();
          const lines = text.split(/\\n/).filter(line => line.trim());
          return {
            title: lines[0] || '',
            company: lines.find(l => l.match(/㈜|주식회사/) || (l.length <= 8 && !l.match(/경력|지원/))) || '',
            experience: lines.find(l => l.match(/경력/)) || '',
            location: lines.find(l => l.match(/서울|경기|부산/)) || '',
            link: card.querySelector('a[href*=\"Recruit\"]')?.href || ''
          };
        }).filter(job => job.title && job.company);
        
        console.log(JSON.stringify(jobs));
      " --json > temp_parallel_results/${source}_jobs.json
      ;;
      
    "linkedin")
      agent-browser eval "
        const jobs = [...document.querySelectorAll('.jobs-search__results-list li, .base-card')].slice(0,20).map(el => {
          const title = el.querySelector('h3, .base-search-card__title')?.textContent?.trim() || '';
          const company = el.querySelector('h4, .base-search-card__subtitle')?.textContent?.trim() || '';
          const location = el.querySelector('.job-search-card__location')?.textContent?.trim() || '';
          const link = el.querySelector('a[href*=\"/jobs/\"]')?.href || '';
          
          if (title && company) {
            return { title, company, location, link };
          }
          return null;
        }).filter(job => job !== null);
        
        console.log(JSON.stringify(jobs));
      " --json > temp_parallel_results/${source}_jobs.json
      ;;
  esac
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  echo "✅ $source scraped in ${duration}s"
  
  # Keep browser session open for potential reuse
  if [ "$PARALLEL_SCRAPING" = "true" ] && [ $((end_time - TOTAL_START_TIME)) -lt 120 ]; then
    echo "🔄 Keeping session alive for reuse..."
  else
    agent-browser close
  fi
}

# Execute parallel scraping with dynamic load balancing
echo "🚀 Starting parallel scraping with $MAX_PARALLEL concurrent sources..."

# Start scraping all sources in background
scrape_source "wanted" "$keyword" &
WANTED_PID=$!

scrape_source "jobkorea" "$keyword" &  
JOBKOREA_PID=$!

scrape_source "linkedin" "$keyword" &
LINKEDIN_PID=$!

# Wait for all parallel jobs to complete with timeout
echo "⏳ Waiting for parallel scraping to complete..."

# Wait with timeout (180 seconds total)
timeout 180 bash -c "
  wait $WANTED_PID
  echo '✅ Wanted scraping completed'
  
  wait $JOBKOREA_PID  
  echo '✅ JobKorea scraping completed'
  
  wait $LINKEDIN_PID
  echo '✅ LinkedIn scraping completed'
" || echo "⚠️ Parallel scraping timeout occurred"

# Merge parallel results
echo "📊 Merging parallel results..."

# Combine all JSON results
cat temp_parallel_results/*_jobs.json | jq -s '.[][]' | jq '{ jobs: ., total: length, sources: ["wanted", "jobkorea", "linkedin"] }' > parallel_scraping_results.json

# Cleanup temporary files
rm -rf temp_parallel_results

# Calculate total scraping time
TOTAL_END_TIME=$(date +%s)
TOTAL_DURATION=$((TOTAL_END_TIME - TOTAL_START_TIME))
echo "🎯 Parallel scraping completed in ${TOTAL_DURATION}s"

# Performance metrics
JOBS_COUNT=$(jq '.total' parallel_scraping_results.json)
echo "📈 Collected ${JOBS_COUNT} jobs from 3 sources in ${TOTAL_DURATION}s"
echo "📊 Average time per source: $((TOTAL_DURATION / 3))s"
echo "📊 Jobs per minute: $(echo "scale=1; ${JOBS_COUNT} / (${TOTAL_DURATION} / 60)" | bc)"
```

## Work Type Detection (EXP-025)

Detect work_type from listing text BEFORE other parsing. Order matters (check remote first):
- **remote**: 전면재택, 재택근무, 풀리모트, full remote, 원격근무, fully remote, 100% remote
- **hybrid**: 하이브리드, 주N일출근, hybrid, 주N일 출근
- **onsite**: Default if no remote/hybrid keywords found

After detection, **remove work_type keywords from text** to avoid polluting title extraction.

## Location Detection (EXP-025)

Extract location from brackets `[...]` first (city + optional district):
- Korean cities: 서울, 경기, 부산, 대전, 인천, 광주, 대구, 울산, 수원, 이천
- Known districts: 판교, 강남, 영등포, 송파, 성수, 역삼, 잠실, 마포, 용산, 구로, 분당, 일산, 평촌
- Pattern: `서울 영등포구`, `[판교]`, `[부산/...]`
- Extract just the location part even from mixed brackets (e.g., `[부산/경력 5년]` → location: `부산`)

If no bracket location, check remaining text for bare city/district keywords and remove them from working text.

## Work Type Detection
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
