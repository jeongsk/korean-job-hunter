// Standalone Wanted parsing script for agent-browser eval injection
// Usage: agent-browser eval "$(cat scripts/parse-wanted.js)"
// 
// This file avoids shell regex escaping issues by being read directly.
// Called from scraper-agent.md workflow.

(() => {
  const jobs = [...document.querySelectorAll('a[href*="/wd/"]')].slice(0, 25).map(el => {
    const allText = (el.textContent || '').trim();
    const link = el.href;
    const wdId = link ? link.split('/wd/')[1] : '';
    
    let result = { id: wdId, title: '', company: '', experience: '', work_type: '', location: '', reward: '', link: link };
    
    // === Step 0: Work type detection (before other parsing) ===
    const remoteKW = /(전면재택|재택근무|풀리모트|full\s*remote|원격근무|fully\s*remote|100%\s*remote)/i;
    const hybridKW = /(하이브리드|주\d일\s*출근|hybrid|주\d일출근)/i;
    if (remoteKW.test(allText)) {
      result.work_type = 'remote';
    } else if (hybridKW.test(allText)) {
      result.work_type = 'hybrid';
    } else {
      result.work_type = 'onsite';
    }
    
    // === Step 0b: Location detection from brackets ===
    const cities = ['서울','경기','부산','대전','인천','광주','대구','울산','수원','이천','세종'];
    const districts = ['판교','강남','영등포','송파','성수','역삼','잠실','마포','용산','구로','분당','일산','평촌','여의도','신촌','홍대','건대'];
    const allLocations = [...cities, ...districts];
    
    const bracketMatch = allText.match(/\[([^\]]+)\]/g);
    if (bracketMatch) {
      for (const bracket of bracketMatch) {
        const found = allLocations.find(loc => bracket.includes(loc));
        if (found) {
          // Try to get city+district
          const cityInBracket = cities.find(c => bracket.includes(c));
          const districtInBracket = districts.find(d => bracket.includes(d));
          result.location = [cityInBracket, districtInBracket].filter(Boolean).join(' ') || found;
          break;
        }
      }
    }
    // Bare text location fallback
    if (!result.location) {
      for (const loc of allLocations) {
        if (allText.includes(loc)) {
          result.location = loc;
          break;
        }
      }
    }
    
    // === Step 1: Pre-segment concatenated text ===
    let workingText = allText
      .replace(/(경력)/g, ' $1')
      .replace(/(합격|보상금|성과금)/g, ' $1')
      .replace(/\[.*?\]/g, '')
      .replace(/\//g, ' ')
      .trim();
    
    // Remove work_type keywords from text
    workingText = workingText.replace(remoteKW, ' ').replace(hybridKW, ' ');
    // Remove location keywords from text
    for (const loc of allLocations) {
      if (result.location && result.location.includes(loc)) {
        workingText = workingText.replace(loc, ' ');
      }
    }
    
    // === Step 2: Experience extraction ===
    const expMatchKorean = workingText.match(/경력\s*(\d+[-~]\d+년|\d+년\s*이상|\d+년↑|무관)/);
    const expMatchEnglish = workingText.match(/(\d+)\s*years?/i);
    
    if (expMatchKorean) {
      result.experience = '경력 ' + expMatchKorean[1];
      workingText = workingText.replace(expMatchKorean[0], ' ').trim();
    } else if (expMatchEnglish) {
      result.experience = expMatchEnglish[0] + ' 경력';
      workingText = workingText.replace(expMatchEnglish[0], ' ').trim();
    }
    
    // === Step 3: Reward extraction ===
    const rewardMatch = workingText.match(/(보상금|합격금|성과금)\s*(\d+[,，]?\d*만원|\d+[,，]?\d*원)/);
    if (rewardMatch) {
      result.reward = rewardMatch[0];
      workingText = workingText.replace(rewardMatch[0], ' ').trim();
    }
    
    // Clean noise: standalone 합격
    workingText = workingText.replace(/\b합급?\b/g, '').replace(/합격/g, ' ').trim();
    
    // === Step 4: Company extraction (multi-strategy) ===
    let companyMatch = null;
    
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    
    // Strategy 1: Korean company indicators including (주), ㈜
    const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '(주)', '(유)'];
    for (const indicator of koreanIndicators) {
      const esc = escapeRegExp(indicator);
      const pattern = new RegExp(esc + '\\s*([^\\s,]+(?:\\s[^\\s,]+)?)');
      const match = workingText.match(pattern);
      if (match && match[1]) {
        companyMatch = match[1].trim();
        workingText = workingText.replace(match[0], ' ');
        break;
      }
    }
    
    // Strategy 2: English company indicators
    if (!companyMatch) {
      const englishPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc\.|LLC|Corp\.|Co\.|Ltd\.|GmbH)/i;
      const match = workingText.match(englishPattern);
      if (match && match[1]) {
        companyMatch = match[1].trim();
        workingText = workingText.replace(match[0], ' ');
      }
    }
    
    // Strategy 3: Known Korean company database
    if (!companyMatch) {
      const koreanCompanies = [
        '토스','스패이드','비댁스','웨이브릿지','미래엔','코어셀','트리노드','페칭','에버온','키트웍스',
        '카카오','네이버','삼성','라인','우아한형제들','배달의민족','당근마켓','크몽','야놀자',
        '쿠팡','카카오뱅크','토스뱅크','배민','위메프','인터엑스','윙잇','111퍼센트','에이엑스',
        '지엠소프트','한컴','네오위즈','넥슨','엔씨소프트','더존','키움',
        '애플코리아','한국IBM','IBM코리아','구글코리아','아마존코리아'
      ];
      
      let companies = [];
      koreanCompanies.forEach(company => {
        const pattern = new RegExp(escapeRegExp(company), 'g');
        let match;
        while ((match = pattern.exec(workingText)) !== null) {
          companies.push({ name: company, index: match.index, length: company.length });
        }
      });
      
      if (companies.length > 0) {
        // Score by position (earlier = better)
        companies.sort((a, b) => a.index - b.index);
        companyMatch = companies[0].name;
        workingText = workingText.replace(new RegExp(escapeRegExp(companyMatch)), ' ');
      }
    }
    
    // Strategy 4: Pattern-based Korean company names
    if (!companyMatch) {
      const koreanPatterns = [
        /[가-힣]{2,6}(?:기업|그룹|솔루션|테크|시스템|랩스|인터내셔널|코리아|글로벌|소프트웨어|플랫폼)/,
        /[가-힣]{3,5}(?:연구소|테크놀로지|스튜디오)/,
        /[가-힣]{2,4}(?:컴퍼니|커머스|네트워크|서비스)/
      ];
      for (const pattern of koreanPatterns) {
        const match = workingText.match(pattern);
        if (match && match[0]) {
          companyMatch = match[0];
          workingText = workingText.replace(match[0], ' ');
          break;
        }
      }
    }
    
    // Strategy 5: Fallback - extract Korean word that looks like a company
    if (!companyMatch) {
      // Blacklist: words that are NOT company names
      const blacklist = /^(시니어|주니어|미드|리드|매니저|수석|책임|전임|연구원|개발자|프론트엔드|백엔드|풀스택|데브옵스|유경험자|신입|경력|지원자|우대|필수|가능|능통|숙련|이상|이하|포함|제외|혜택|복지|근무|재택|출근|합격|보상금|성과금|프론트|백엔|서버|클라이언트|모바일|웹|앱|데이터|엔지니어|아키텍트|디자이너|기획자|PM|PO|CTO|CTO|VP|디렉터)$/i;
      
      const koreanWords = workingText.match(/[가-힣]{2,}/g);
      if (koreanWords && koreanWords.length > 0) {
        // Filter out blacklisted words
        const candidates = koreanWords.filter(w => !blacklist.test(w));
        if (candidates.length > 0) {
          // Pick the LAST Korean word (company usually appears after title in Wanted text)
          companyMatch = candidates[candidates.length - 1];
          workingText = workingText.replace(companyMatch, ' ');
        }
      }
    }
    
    if (companyMatch) {
      result.company = companyMatch.trim();
    } else {
      result.company = '회사명 미상';
    }
    
    // === Step 5: Title is what's left ===
    result.title = workingText
      .replace(/\(주\)/g, '')
      .replace(/[,·\s]+/g, ' ')
      .trim() || '직무 미상';
    
    return result;
  });
  
  // Deduplicate by ID
  const seen = new Set();
  const unique = jobs.filter(j => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return j.title !== '직무 미상' || j.company !== '회사명 미상';
  });
  
  return JSON.stringify(unique);
})()
