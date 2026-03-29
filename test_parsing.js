// Test script for improved Wanted field parsing logic
// This simulates the text parsing without needing an actual browser session

const testCases = [
  {
    input: "카카오 백엔드 개발자 경력 3~5년 보상금 100만원",
    expected: { title: "카카오 백엔드 개발자", company: "카카오", experience: "경력 3~5년", reward: "보상금 100만원" }
  },
  {
    input: "㈜삼성전자 백엔드 엔지니어 경력 5년 이상 합격금 200만원",
    expected: { title: "백엔드 엔지니어", company: "㈜삼성전자", experience: "경력 5년 이상", reward: "합격금 200만원" }
  },
  {
    input: "[서울] 네이버 프론트엔드 개발자 경력 2~3년",
    expected: { title: "프론트엔드 개발자", company: "네이버", experience: "경력 2~3년", reward: "" }
  },
  {
    input: "주식회사 라인 백엔드 개발자 경력 무관 보상금 150만원",
    expected: { title: "백엔드 개발자", company: "주식회사 라인", experience: "경력 무관", reward: "보상금 150만원" }
  },
  {
    input: "테스트 [부산/경력 5년 이상]",
    expected: { title: "테스트", company: "회사명 미상", experience: "경력 5년 이상", reward: "" }
  }
];

function simpleParse(allText) {
  let result = { title: '', company: '', experience: '', reward: '' };
  let workingText = allText;
  
  console.log(`Original text: "${workingText}"`);
  
  // Very basic location removal
  workingText = workingText
    .replace(/\\[.*?\\]/g, '')  // Remove [location] patterns
    .replace(/\\/g, '')         // Remove standalone slashes
    .trim();
  
  console.log(`After basic cleanup: "${workingText}"`);
  
  // Simple experience extraction
  const expMatch = workingText.match(/경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/);
  if (expMatch) {
    result.experience = '경력 ' + expMatch[1];
    workingText = workingText.replace(expMatch[0], ' ').trim();
  }
  
  console.log(`After experience extraction: "${workingText}"`);
  
  // Simple reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  console.log(`After reward extraction: "${workingText}"`);
  
  // Simple company extraction
  // Look for company indicators and take next word
  const companyIndicators = ['㈜', '주식회사', 'corp', 'Corp'];
  let companyMatch = null;
  
  for (const indicator of companyIndicators) {
    const pattern = new RegExp(`${indicator}\\s*([^\\s,]+)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = match[0];
      break;
    }
  }
  
  if (companyMatch) {
    result.company = companyMatch;
    workingText = workingText.replace(companyMatch, ' ').trim();
  } else {
    // Fallback: look for standalone company names
    const companyPatterns = [
      /(?:카카오|네이버|삼성|라인|우아한형제들|배달의민족|토스|배민|우아한)/g
    ];
    
    for (const pattern of companyPatterns) {
      const match = workingText.match(pattern);
      if (match) {
        result.company = match[0];
        workingText = workingText.replace(match[0], ' ').trim();
        break;
      }
    }
  }
  
  console.log(`After company extraction: "${workingText}"`);
  
  // Title is what's left (remove extra spaces and common separators)
  const titleText = workingText
    .replace(/[,·\s]+/g, ' ')
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
  
  return result;
}

console.log("Testing simple Wanted field parsing...\n");

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test ${index + 1} ===`);
  const parsed = simpleParse(testCase.input);
  const passed = JSON.stringify(parsed) === JSON.stringify(testCase.expected);
  
  console.log(`Input: "${testCase.input}"`);
  console.log(`Expected:`, JSON.stringify(testCase.expected, null, 2));
  console.log(`Parsed:`, JSON.stringify(parsed, null, 2));
  console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log("---");
});

console.log("\nTest completed.");