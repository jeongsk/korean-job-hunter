// Test script for Wanted field parsing — now tests the PRODUCTION parser
// EXP-055: Unified with scripts/post-process-wanted.js instead of inline copy
const { parseWantedJob } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

const testCases = [
  {
    input: "카카오 백엔드 개발자 경력 3~5년 보상금 100만원",
    expected: { title: "백엔드 개발자", company: "카카오", experience: "경력 3~5년", reward: "보상금 100만원", work_type: "onsite", location: "" }
  },
  {
    input: "㈜삼성전자 백엔드 엔지니어 경력 5년 이상 합격금 200만원",
    expected: { title: /백엔드 엔지니어/, company: /삼성전자/, experience: "경력 5년 이상", reward: "합격금 200만원", work_type: "onsite", location: "" }
  },
  {
    input: "[서울] 네이버 프론트엔드 개발자 경력 2~3년",
    expected: { title: "프론트엔드 개발자", company: "네이버", experience: "경력 2~3년", reward: "", work_type: "onsite", location: "서울" }
  },
  {
    input: "주식회사 라인 백엔드 개발자 경력 무관 보상금 150만원",
    expected: { title: /백엔드 개발자/, company: /라인/, experience: "경력 무관", reward: "보상금 150만원", work_type: "onsite", location: "" }
  },
  {
    input: "테스트 [부산/경력 5년 이상]",
    expected: { title: "직무 미상", company: "테스트", experience: "경력 5년 이상", reward: "", work_type: "onsite", location: "부산" }
  },
  // EXP-023: Additional edge cases
  {
    input: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
    expected: { title: /Back-end Developer.*Senior/, company: "웨이브릿지", experience: "경력 5-9년", reward: "보상금 100만원", work_type: "onsite", location: "" }
  },
  {
    input: "토스 시니어 백엔드 엔지니어 경력 7년↑ 보상금 500만원",
    expected: { title: /시니어 백엔드 엔지니어/, company: "토스", experience: "경력 7년↑", reward: "보상금 500만원", work_type: "onsite", location: "" }
  },
  {
    input: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
    expected: { title: /디지털 학습 플랫폼 백엔드 개발자.*JAVA/, company: "미래엔", experience: "경력 5년 이상", reward: "보상금 100만원", work_type: "onsite", location: "" }
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

// Fields to compare (production parser returns extra fields we ignore)
const COMPARE_FIELDS = ['title', 'company', 'experience', 'reward', 'work_type', 'location'];

function checkField(actual, expected) {
  if (expected instanceof RegExp) return expected.test(actual);
  return actual === expected;
}

testCases.forEach((testCase, index) => {
  const parsed = parseWantedJob(testCase.input);
  let ok = true;
  const mismatches = [];

  for (const field of COMPARE_FIELDS) {
    const expected = testCase.expected[field];
    const actual = parsed[field] ?? '';
    if (!checkField(actual, expected)) {
      ok = false;
      mismatches.push(`${field}: got "${actual}", expected ${expected instanceof RegExp ? '~' + expected : '"' + expected + '"'}`);
    }
  }

  if (ok) {
    passed++;
    console.log(`✅ Test ${index + 1}: "${testCase.input.substring(0, 50)}..."`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: "${testCase.input.substring(0, 50)}..."`);
    mismatches.forEach(m => console.log(`   ${m}`));
  }
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 Parsing Tests (production parser): ${passed}/${passed + failed} passed`);
if (failed === 0) console.log(`✅ All parsing tests passed against production parser!`);
else console.log(`❌ ${failed} test(s) failed — production parser divergence detected!`);
