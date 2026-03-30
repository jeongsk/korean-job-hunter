// Test script for improved Wanted field parsing logic
// This simulates the text parsing without needing an actual browser session

const testCases = [
  {
    input: "카카오 백엔드 개발자 경력 3~5년 보상금 100만원",
    expected: { title: "백엔드 개발자", company: "카카오", experience: "경력 3~5년", reward: "보상금 100만원" }
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
  },
  // EXP-023: Additional edge cases
  {
    input: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
    expected: { title: "Back-end Developer (Senior)", company: "웨이브릿지", experience: "경력 5-9년", reward: "보상금 100만원" }
  },
  {
    input: "토스 시니어 백엔드 엔지니어 경력 7년↑ 보상금 500만원",
    expected: { title: "시니어 백엔드 엔지니어", company: "토스", experience: "경력 7년↑", reward: "보상금 500만원" }
  },
  {
    input: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
    expected: { title: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)", company: "미래엔", experience: "경력 5년 이상", reward: "보상금 100만원" }
  }
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function simpleParse(allText) {
  let result = { title: '', company: '', experience: '', reward: '' };
  let workingText = allText;
  
  console.log(`Original text: "${workingText}"`);
  
  // Step 0: Extract experience from brackets BEFORE removing them
  const bracketExpMatch = workingText.match(/경력[\s]*(\d+~\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (bracketExpMatch && !result.experience) {
    result.experience = '경력 ' + bracketExpMatch[1];
  }

  // Pre-segment: insert spaces before known boundary markers for concatenated text
  workingText = workingText
    .replace(/(경력)/g, ' $1')       // space before 경력
    .replace(/(합격|보상금|성과금)/g, ' $1')  // space before reward markers
    .trim();

  // Basic location/bracket removal
  workingText = workingText
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, ' ')      // Replace standalone slashes with space
    .trim();
  
  console.log(`After basic cleanup: "${workingText}"`);
  
  // Enhanced experience extraction (supports both ~ and - as range separators)
  const expMatch = workingText.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (expMatch) {
    result.experience = '경력 ' + expMatch[1];
    workingText = workingText.replace(expMatch[0], ' ').trim();
  }
  
  console.log(`After experience extraction: "${workingText}"`);
  
  // Enhanced reward extraction (보상금/합격금 + amount)
  const rewardMatch = workingText.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  console.log(`After reward extraction: "${workingText}"`);
  
  // Clean noise words like 합격 (not followed by 금/만원)
  workingText = workingText.replace(/\b합급?\b/g, '').trim();
  workingText = workingText.replace(/합격/g, ' ').trim();
  
  // Simple company extraction
  const companyIndicators = ['㈜', '주식회사', 'corp', 'Corp'];
  let companyMatch = null;
  
  for (const indicator of companyIndicators) {
    const pattern = new RegExp(`${escapeRegExp(indicator)}\\s*([^\\s,]+)`);
    const match = workingText.match(pattern);
    if (match) {
      companyMatch = match[0];
      break;
    }
  }
  
  if (companyMatch) {
    result.company = companyMatch;
    workingText = workingText.replace(companyMatch, ' ').trim();
  }
  
  // Fallback: known company database
  if (!companyMatch) {
    const knownCompanies = [
      '토스', '스패이드', '비댁스', '웨이브릿지', '미래엔', '코어셀', '트리노드', '페칭',
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '당근마켓', '쿠팡',
      '배민', '키움', '더존', '한컴', '네오위즈', '넥슨', '엔씨소프트'
    ];
    
    for (const company of knownCompanies) {
      const pattern = new RegExp(escapeRegExp(company));
      const match = workingText.match(pattern);
      if (match) {
        companyMatch = match[0];
        workingText = workingText.replace(match[0], ' ').trim();
        break;
      }
    }
  }
  
  if (companyMatch) {
    result.company = companyMatch;
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