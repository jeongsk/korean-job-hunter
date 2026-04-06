// Enhanced Scraping Test Script
// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Enhanced company extraction function
function extractEnhancedCompany(text) {
  let companyMatch = null;
  let workingText = text;
  
  // Strategy 1: Traditional Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(`${indicator}[\\s]*([^\\s,]+(?:\\s[^\\s,]+)?)`);
    const match = workingText.match(pattern);
    if (match && match[1]) {
      companyMatch = match[1].trim();
      break;
    }
  }
  
  // Strategy 2: Comprehensive Korean company name list
  if (!companyMatch) {
    const koreanCompanies = [
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스',
      '우아한', '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트',
      '한컴', '네오위즈', '넥슨', '엔씨소프트', '엘림스', '더존', '원스톱',
      '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아',
      '비댁스', '에버온', '코어셀', '키트웍스'
    ];
    
    for (const company of koreanCompanies) {
      const pattern = new RegExp(`${company}(?=[경능명년]|$)`);
      const match = workingText.match(pattern);
      if (match) {
        companyMatch = company;
        workingText = workingText.replace(new RegExp(escapeRegExp(company), 'g'), ' ').trim();
        break;
      }
    }
  }
  
  return {
    company: companyMatch || '회사명 미상',
    cleanedText: workingText
  };
}

// Enhanced job extraction function
[...document.querySelectorAll('a[href*="/wd/"]')].slice(0,10).map(el => {
  const allText = (el.textContent || '').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
  let workingText = allText;
  
  // Step 1: Location removal
  workingText = workingText
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, '')         // Remove standalone slashes
    .trim();
  
  // Step 2: Experience extraction
  const expMatch = workingText.match(/경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/);
  if (expMatch) {
    result.experience = '경력 ' + expMatch[1];
    workingText = workingText.replace(expMatch[0], ' ').trim();
  }
  
  // Step 3: Reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  // Step 4: Enhanced company extraction
  const companyResult = extractEnhancedCompany(workingText);
  result.company = companyResult.company;
  workingText = companyResult.cleanedText;
  
  // Step 5: Title extraction
  const titleText = workingText
    .replace(/[,·\s]+/g, ' ')
    .trim();
  
  if (titleText) {
    result.title = titleText;
  } else {
    result.title = '직무 미상';
  }
  
  return result;
})