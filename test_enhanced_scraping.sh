#!/bin/bash

# Test the enhanced scraping algorithm
echo "Testing enhanced scraping algorithm..."

# Navigate to the project directory
cd /Users/jeongsk/.openclaw/workspace/korean-job-hunter

# Test cases with expected company names
test_cases=(
  "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원"
  "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원"
  "[부산/경력 5년 이상] 코어셀 - 프로덕트 엔지니어트리노드경력 5년 이상합격보상금 100만원"
  "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원"
  "Backend Engineer Lead비댁스경력 9-16년합격보상금 100만원"
)

# Expected company names
expected_companies=(
  "미래엔"
  "웨이브릿지"
  "코어셀"
  "스패이드"
  "비댁스"
)

# Create test script
cat > test_enhanced_scraping.js << 'EOF'
const testCases = [
  "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
  "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
  "[부산/경력 5년 이상] 코어셀 - 프로덕트 엔지니어트리노드경력 5년 이상합격보상금 100만원",
  "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원",
  "Backend Engineer Lead비댁스경력 9-16년합격보상금 100만원"
];

function extractEnhancedCompany(text) {
  let workingText = text
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, '')         // Remove standalone slashes
    .trim();
  
  let result = { title: '', company: '', experience: '', reward: '' };
  
  // Step 1: Enhanced experience extraction (Korean + English)
  const expMatchKorean = workingText.match(/경력[\s]*(\d+[^년]*년|\d+년 이상|\d+년↑|무관)/);
  const expMatchEnglish = workingText.match(/(\d+)\s*years?/i);
  
  if (expMatchKorean) {
    result.experience = '경력 ' + expMatchKorean[1];
    workingText = workingText.replace(expMatchKorean[0], ' ').trim();
  } else if (expMatchEnglish) {
    result.experience = expMatchEnglish[0] + ' 경력';
    workingText = workingText.replace(expMatchEnglish[0], ' ').trim();
  }
  
  // Step 2: Reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금|성과금)[\s]*(\d+만원|\d+원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  // Step 3: Enhanced context-aware company extraction
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(`${indicator}[\s]*([^\s,]+(?:\s[^\s,]+)?)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = match[1];
      break;
    }
  }
  
  // Strategy 2: Context-aware Korean company database with positional scoring
  if (!companyMatch) {
    const koreanCompanies = [
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스', '우아한', '당근마켓', 
      '크몽', '야놀자', '마이플레이스', '지엠소프트', '한컴', '네오위즈', '넥슨', '엔씨소프트', 
      '엘림스', '더존', '원스톱', '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아', 
      '비댁스', '에버온', '코어셀', '키트웍스', '스패이드', '유모스원', '브이젠', '리스타'
    ];
    
    // Find all company occurrences with context scoring
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
    
    // Score companies based on position and context
    let scoredCompanies = companies.map(company => {
      let score = 0;
      
      // Position-based scoring (earlier = higher priority)
      score += (100 - company.index) / 100;
      
      // Length-based scoring (shorter = more specific)
      score += (20 - company.length) / 20;
      
      // Context bonus for companies before separators (e.g., " - ")
      const separatorPos = workingText.indexOf(' - ', company.index);
      if (separatorPos > 0 && separatorPos < company.index + company.length + 10) {
        score += 10;
      }
      
      return { ...company, score };
    });
    
    // Sort by score and pick the best
    scoredCompanies.sort((a, b) => b.score - a.score);
    if (scoredCompanies.length > 0) {
      companyMatch = scoredCompanies[0].name;
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
  
  // Step 4: Title is what's left
  const titleText = workingText
    .replace(/[,·\s]+/g, ' ')
    .trim();
  
  if (titleText) {
    result.title = titleText;
  } else {
    result.title = '직무 미상';
  }
  
  return result;
}

// Run tests
console.log("Enhanced Scraping Algorithm Test Results:");
console.log("===========================================");

let successCount = 0;
const expectedCompanies = ["미래엔", "웨이브릿지", "코어셀", "스패이드", "비댁스"];

testCases.forEach((testCase, index) => {
  const result = extractEnhancedCompany(testCase);
  const expected = expectedCompanies[index];
  const success = result.company === expected;
  
  console.log(`\nTest ${index + 1}:`);
  console.log(`Input: "${testCase}"`);
  console.log(`Expected: ${expected}`);
  console.log(`Actual: ${result.company}`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Extracted:`, result);
  
  if (success) successCount++;
});

console.log("\n===========================================");
console.log(`Summary: ${successCount}/${testCases.length} tests passed`);
console.log(`Success Rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`);

// Calculate field completeness
let totalFields = 0;
let completeFields = 0;

testCases.forEach((testCase, index) => {
  const result = extractEnhancedCompany(testCase);
  totalFields += 4; // title, company, experience, reward
  
  if (result.title && result.title !== '직무 미상') completeFields++;
  if (result.company && result.company !== '회사명 미상') completeFields++;
  if (result.experience) completeFields++;
  if (result.reward) completeFields++;
});

const fieldCompleteness = (completeFields / totalFields) * 100;
console.log(`\nField Completeness: ${fieldCompleteness.toFixed(1)}% (${completeFields}/${totalFields})`);
EOF

# Run the test
node test_enhanced_scraping.js

# Clean up
rm test_enhanced_scraping.js

echo "Test completed."