// Debug the English text cases
const testCases = [
  "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
  "Backend Engineer Lead비댁스경력 9-16년합격보상금 100만원"
];

function debugEnglishExtraction(text) {
  console.log(`\n🔍 DEBUG: Processing text: "${text}"`);
  
  let workingText = text
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, '')         // Remove standalone slashes
    .trim();
  
  console.log(`📝 Step 1 - After location cleanup: "${workingText}"`);
  
  // Step 2: Enhanced experience extraction (Korean + English)
  const expMatchKorean = workingText.match(/경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/);
  const expMatchEnglish = workingText.match(/(\d+)\s*years?/i);
  
  console.log(`🔍 Korean experience pattern match:`, expMatchKorean);
  console.log(`🔍 English experience pattern match:`, expMatchEnglish);
  
  if (expMatchKorean) {
    const experience = '경력 ' + expMatchKorean[1];
    workingText = workingText.replace(expMatchKorean[0], ' ').trim();
    console.log(`🎯 Step 2 - Korean experience extracted: "${experience}"`);
    console.log(`📝 Step 2 - After experience removal: "${workingText}"`);
  } else if (expMatchEnglish) {
    const experience = expMatchEnglish[0] + ' 경력';
    workingText = workingText.replace(expMatchEnglish[0], ' ').trim();
    console.log(`🎯 Step 2 - English experience extracted: "${experience}"`);
    console.log(`📝 Step 2 - After experience removal: "${workingText}"`);
  } else {
    console.log(`❌ Step 2 - No experience extracted`);
  }
  
  // Step 3: Reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금|성과금)[\s]*(\d+만원|\d+원)/);
  if (rewardMatch) {
    console.log(`🎯 Step 3 - Reward extracted: "${rewardMatch[0]}"`);
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
    console.log(`📝 Step 3 - After reward removal: "${workingText}"`);
  }
  
  // Step 4: Company extraction
  console.log(`🔍 Step 4 - Text for company extraction: "${workingText}"`);
  
  let companyMatch = null;
  
  // Strategy 2: Comprehensive Korean company database
  const koreanCompanies = ['토스', '스패이드', '비댁스', '웨이브릿지', '미래엔', '코어셀', '트리노드', '페칭', '에버온', '키트웍스'];
  
  for (const company of koreanCompanies) {
    const pattern = new RegExp(`${company}(?:\\s|$)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = company;
      console.log(`✅ Found company "${company}" with pattern: ${pattern}`);
      break;
    }
  }
  
  console.log(`🎯 Final company: ${companyMatch || '회사명 미상'}`);
}

// Run debug
console.log("🐛 DEBUG English Text Cases");
console.log("============================");

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  debugEnglishExtraction(testCase);
});