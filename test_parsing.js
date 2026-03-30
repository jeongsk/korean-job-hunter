// Test script for improved Wanted field parsing logic
// This simulates the text parsing without needing an actual browser session

const testCases = [
  {
    input: "카카오 백엔드 개발자 경력 3~5년 보상금 100만원",
    expected: { title: "백엔드 개발자", company: "카카오", experience: "경력 3~5년", reward: "보상금 100만원", work_type: "onsite", location: "" }
  },
  {
    input: "㈜삼성전자 백엔드 엔지니어 경력 5년 이상 합격금 200만원",
    expected: { title: "백엔드 엔지니어", company: "㈜삼성전자", experience: "경력 5년 이상", reward: "합격금 200만원", work_type: "onsite", location: "" }
  },
  {
    input: "[서울] 네이버 프론트엔드 개발자 경력 2~3년",
    expected: { title: "프론트엔드 개발자", company: "네이버", experience: "경력 2~3년", reward: "", work_type: "onsite", location: "서울" }
  },
  {
    input: "주식회사 라인 백엔드 개발자 경력 무관 보상금 150만원",
    expected: { title: "백엔드 개발자", company: "주식회사 라인", experience: "경력 무관", reward: "보상금 150만원", work_type: "onsite", location: "" }
  },
  {
    input: "테스트 [부산/경력 5년 이상]",
    expected: { title: "테스트", company: "회사명 미상", experience: "경력 5년 이상", reward: "", work_type: "onsite", location: "부산" }
  },
  // EXP-023: Additional edge cases
  {
    input: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
    expected: { title: "Back-end Developer (Senior)", company: "웨이브릿지", experience: "경력 5-9년", reward: "보상금 100만원", work_type: "onsite", location: "" }
  },
  {
    input: "토스 시니어 백엔드 엔지니어 경력 7년↑ 보상금 500만원",
    expected: { title: "시니어 백엔드 엔지니어", company: "토스", experience: "경력 7년↑", reward: "보상금 500만원", work_type: "onsite", location: "" }
  },
  {
    input: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
    expected: { title: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)", company: "미래엔", experience: "경력 5년 이상", reward: "보상금 100만원", work_type: "onsite", location: "" }
  },
  // EXP-025: work_type + location detection edge cases
  {
    input: "카카오 프론트엔드 개발자 재택근무 경력 3~5년 서울",
    expected: { title: "프론트엔드 개발자", company: "카카오", experience: "경력 3~5년", reward: "", work_type: "remote", location: "서울" }
  },
  {
    input: "네이버 백엔드 개발자 하이브리드 경력 2~4년 [판교] 보상금 200만원",
    expected: { title: "백엔드 개발자", company: "네이버", experience: "경력 2~4년", reward: "보상금 200만원", work_type: "hybrid", location: "판교" }
  },
  {
    input: "토스 안드로이드 개발자 전면재택 경력 5년 이상 보상금 300만원",
    expected: { title: "안드로이드 개발자", company: "토스", experience: "경력 5년 이상", reward: "보상금 300만원", work_type: "remote", location: "" }
  },
  {
    input: "라인 프론트엔드 엔지니어 주3일출근 경력 3~6년 [서울 영등포구]",
    expected: { title: "프론트엔드 엔지니어", company: "라인", experience: "경력 3~6년", reward: "", work_type: "hybrid", location: "서울 영등포구" }
  }
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function simpleParse(allText) {
  let result = { title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '' };
  let workingText = allText;
  
  console.log(`Original text: "${workingText}"`);
  
  // Step -1: Extract location from brackets BEFORE removing them (EXP-025)
  // Extract city + optional district from brackets
  const cityPattern = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|금천|분당|일산|평촌|수원|이천)';
  const bracketLocMatch = workingText.match(new RegExp(`\\[([^\\]]*?)${cityPattern}(?:\\s*[가-힣]{2,3}(?:구|시|군))?[^\\]]*?\\]`));
  if (bracketLocMatch) {
    // Extract the full location string (city + district) from bracket content
    const bracketContent = bracketLocMatch[0].replace(/[\[\]]/g, '').replace(/^\//, '').replace(/\/$/, '').trim();
    // Extract just the location part (city + optional district)
    const fullLocMatch = bracketContent.match(new RegExp(`${cityPattern}(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?`));
    if (fullLocMatch) {
      result.location = fullLocMatch[0].trim();
    }
  }
  
  // Step 0: Extract experience from brackets BEFORE removing them
  const bracketExpMatch = workingText.match(/경력[\s]*(\d+~\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (bracketExpMatch && !result.experience) {
    result.experience = '경력 ' + bracketExpMatch[1];
  }
  
  // EXP-025: Extract work_type BEFORE modifying text
  const remotePatterns = ['전면재택', '재택근무', '풀리모트', 'full remote', '원격근무', 'fully remote', '100% remote'];
  const hybridPatterns = ['하이브리드', '주\\d일출근', 'hybrid', '주\\d일 출근'];
  
  for (const pattern of remotePatterns) {
    if (new RegExp(pattern, 'i').test(workingText)) {
      result.work_type = 'remote';
      break;
    }
  }
  if (result.work_type === 'onsite') {
    for (const pattern of hybridPatterns) {
      if (new RegExp(pattern, 'i').test(workingText)) {
        result.work_type = 'hybrid';
        break;
      }
    }
  }
  
  // Remove work_type keywords from text to avoid polluting title
  workingText = workingText
    .replace(/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote/gi, ' ')
    .replace(/하이브리드|주\d일\s*출근|hybrid/gi, ' ');

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
  
  // EXP-025: Extract bare location keywords from text (not in brackets)
  if (!result.location) {
    const locationPatterns = [
      /((?:서울|경기|부산|대전|인천|광주|대구|울산)(?:\s+\p{Script=Hangul}{2,3}(?:구|시|군)?)?)/u,
      /(판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천)/
    ];
    for (const pat of locationPatterns) {
      const m = workingText.match(pat);
      if (m) {
        result.location = m[1] || m[0];
        break;
      }
    }
  }
  
  // Remove location keywords from working text
  if (result.location) {
    workingText = workingText.replace(new RegExp(escapeRegExp(result.location), 'g'), ' ').trim();
  }
  
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
  if (!result.work_type) {
    result.work_type = 'onsite';
  }
  if (!result.location) {
    result.location = '';
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