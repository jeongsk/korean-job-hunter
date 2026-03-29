#!/bin/bash

# Test and Debug Enhanced Company Name Extraction
echo "🔍 Debugging Enhanced Company Name Extraction..."
echo "=================================================="

# Create a debug version to understand the patterns
cat > debug_company_extraction.js << 'EOF'
// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Debug version with logging
function debugExtractCompany(text) {
  console.log(`\n🔍 Analyzing text: "${text}"`);
  let companyMatch = null;
  let workingText = text;
  
  // Strategy 1: Traditional Korean company indicators
  console.log("📍 Strategy 1: Traditional Korean indicators");
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(`${indicator}[\\s]*([^\\s,]+(?:\\s[^\\s,]+)?)`);
    const match = workingText.match(pattern);
    if (match) {
      console.log(`   Found indicator pattern: ${indicator} -> ${match[1]}`);
    }
  }
  
  // Strategy 2: Pattern-based Korean company names
  console.log("📍 Strategy 2: Pattern-based Korean company names");
  const koreanPatterns = [
    /[가-힣]{2,4}(?:기업|그룹|솔루션|테크|시스템|랩스|인터내셔널|코리아|글로벌)/,
    /[가-힣]{2,4}(?:소프트웨어|IT|커뮤니케이션|네트웍스|디지털|플랫폼)/,
    /[가-힣]{2,4}$/,  // Simple 2-4 character Korean words at end of string
    /[가-힣]{2,4}(?:[경능명]|년|이상)/  // Korean names before career info
  ];
  
  for (let i = 0; i < koreanPatterns.length; i++) {
    const pattern = koreanPatterns[i];
    const match = workingText.match(pattern);
    if (match) {
      console.log(`   Pattern ${i+1} matched: ${match[0]}`);
    }
  }
  
  // Strategy 3: Comprehensive Korean company name list with word boundaries
  console.log("📍 Strategy 3: Comprehensive company list");
  const koreanCompanies = [
    '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스',
    '우아한', '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트',
    '한컴', '네오위즈', '넥슨', '엔씨소프트', '엘림스', '더존', '원스톱',
    '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아',
    '비댁스', '에버온', '코어셀', '키트웍스'
  ];
  
  for (const company of koreanCompanies) {
    // Try different patterns for each company
    const patterns = [
      new RegExp(`${escapeRegExp(company)}(?=[경능명년]|$)`),  // Company followed by career info or end
      new RegExp(`(?:^|\\s)${escapeRegExp(company)}(?=\\s|$)`),  // Company at start or with spaces
      new RegExp(`${escapeRegExp(company)}`)  // Simple match
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = workingText.match(patterns[i]);
      if (match) {
        console.log(`   Company "${company}" matched with pattern ${i+1}: ${match[0]}`);
        companyMatch = company;
        break;
      }
    }
    if (companyMatch) break;
  }
  
  console.log(`✅ Final result: "${companyMatch || '회사명 미상'}"`);
  return companyMatch || '회사명 미상';
}

// Test cases
const testCases = [
  "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
  "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원", 
  "[부산/경력 5년 이상] 코어셀 - 프로덕트 엔지니어트리노드경력 5년 이상합격보상금 100만원",
  "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원",
  "서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원",
  "Backend Engineer Lead비댁스경력 9-16년합격보상금 100만원",
  "백엔드 웹프로그래머 (Spring, MSA) (4~6년)키트웍스경력 3-7년합격보상금 100만원",
  "백엔드팀 리드 (팀장급)에버온경력 7년 이상합격보상금 100만원"
];

console.log("🧪 Debug Test Results:");
console.log("=" .repeat(50));

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test Case ${index + 1}:`);
  debugExtractCompany(testCase);
});

EOF

# Run the debug test
node debug_company_extraction.js

# Clean up
rm debug_company_extraction.js