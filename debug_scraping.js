const testCases = [
  "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
  "[부산/경력 5년 이상] 코어셀 - 프로덕트 엔지니어트리노드경력 5년 이상합격보상금 100만원"
];

function debugExtractEnhancedCompany(text) {
  console.log(`\n🔍 DEBUG: Processing text: "${text}"`);
  
  let workingText = text
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, '')         // Remove standalone slashes
    .trim();
  
  console.log(`📝 Step 1 - After location cleanup: "${workingText}"`);
  
  let result = { title: '', company: '', experience: '', reward: '' };
  
  // Step 2: Enhanced experience extraction (Korean + English)
  const expMatchKorean = workingText.match(/경력[\s]*(\d+[^년]*년|\d+년 이상|\d+년↑|무관)/);
  const expMatchEnglish = workingText.match(/(\d+)\s*years?/i);
  
  if (expMatchKorean) {
    result.experience = '경력 ' + expMatchKorean[1];
    workingText = workingText.replace(expMatchKorean[0], ' ').trim();
    console.log(`🎯 Step 2 - Korean experience extracted: "${result.experience}"`);
    console.log(`📝 Step 2 - After experience removal: "${workingText}"`);
  } else if (expMatchEnglish) {
    result.experience = expMatchEnglish[0] + ' 경력';
    workingText = workingText.replace(expMatchEnglish[0], ' ').trim();
    console.log(`🎯 Step 2 - English experience extracted: "${result.experience}"`);
    console.log(`📝 Step 2 - After experience removal: "${workingText}"`);
  }
  
  // Step 3: Reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금|성과금)[\s]*(\d+만원|\d+원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
    console.log(`🎯 Step 3 - Reward extracted: "${result.reward}"`);
    console.log(`📝 Step 3 - After reward removal: "${workingText}"`);
  }
  
  // Step 4: Enhanced multi-stage company extraction
  console.log(`🔍 Step 4 - Starting company extraction on: "${workingText}"`);
  
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(`${indicator}[\s]*([^\s,]+(?:\s[^\s,]+)?)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = match[1];
      console.log(`✅ Strategy 1 - Found company with indicator "${indicator}": "${companyMatch}"`);
      break;
    }
  }
  
  // Strategy 2: Comprehensive Korean company database
  if (!companyMatch) {
    const koreanCompanies = [
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스', '우아한', '당근마켓', 
      '크몽', '야놀자', '마이플레이스', '지엠소프트', '한컴', '네오위즈', '넥슨', '엔씨소프트', 
      '엘림스', '더존', '원스톱', '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아', 
      '비댁스', '에버온', '코어셀', '키트웍스', '스패이드', '유모스원', '브이젠', '리스타'
    ];
    
    console.log(`🔍 Strategy 2 - Testing against ${koreanCompanies.length} companies...`);
    
    for (const company of koreanCompanies) {
      // Enhanced pattern: look for company name followed by space or end of string
      const pattern = new RegExp(`${company}(?:\\s|$)`);
      const match = workingText.match(pattern);
      if (match) {
        companyMatch = company;
        console.log(`✅ Strategy 2 - Found company "${company}" with pattern: ${pattern}`);
        break;
      } else {
        // Debug: show what we're testing
        const testMatch = workingText.includes(company);
        if (testMatch) {
          console.log(`⚠️  Company "${company}" found in text but pattern didn't match`);
        }
      }
    }
  }
  
  if (companyMatch) {
    result.company = companyMatch;
    workingText = workingText.replace(companyMatch, ' ').trim();
    console.log(`🎯 Step 4 - Company extracted: "${result.company}"`);
    console.log(`📝 Step 4 - After company removal: "${workingText}"`);
  } else {
    result.company = '회사명 미상';
    console.log(`❌ Step 4 - No company found`);
  }
  
  // Step 5: Title is what's left
  const titleText = workingText
    .replace(/[,·\s]+/g, ' ')
    .trim();
  
  if (titleText) {
    result.title = titleText;
  } else {
    result.title = '직무 미상';
  }
  
  console.log(`🎯 Final result:`, result);
  return result;
}

// Run debug tests
console.log("🐛 DEBUG Enhanced Scraping Algorithm");
console.log("=====================================");

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  debugExtractEnhancedCompany(testCase);
});