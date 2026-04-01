// Test: post-processing raw Wanted scrape data
// EXP-053: Validate that post-process-wanted.js correctly parses raw concatenated text
const { parseWantedJob } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

function test(name, input, checks) {
  const result = parseWantedJob(input);
  let ok = true;
  for (const [field, expected] of Object.entries(checks)) {
    const actual = result[field];
    if (expected instanceof RegExp) {
      if (!expected.test(actual)) { ok = false; console.log(`❌ ${name}: ${field}="${actual}" !~ ${expected}`); }
    } else if (typeof expected === 'function') {
      if (!expected(actual)) { ok = false; console.log(`❌ ${name}: ${field}="${actual}" check failed`); }
    } else {
      if (actual !== expected) { ok = false; console.log(`❌ ${name}: ${field}="${actual}" !== "${expected}"`); }
    }
  }
  if (ok) { passed++; console.log(`✅ ${name}`); }
  else failed++;
}

// === Real data from wanted_jobs.json ===
test('raw-335055',
  '서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원',
  { company: '케이투스코리아', experience: '경력 5-11년', reward: '보상금 20만원', title: /프리세일즈|Pre-sales/ }
);

test('raw-342675',
  'GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원',
  { company: '스패이드', experience: '경력 4년 이상', reward: '보상금 100만원', title: /GeoAI|Backend/ }
);

test('raw-347727',
  'Backend Engineer (Warehouse Management System)유모스원경력 5-15년합격보상금 100만원',
  { company: '유모스원', experience: '경력 5-15년', reward: '보상금 100만원' }
);

test('raw-350866',
  '디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원',
  { company: '미래엔', experience: '경력 5년 이상', reward: '보상금 100만원', title: /백엔드|JAVA/ }
);

test('raw-350965',
  '백엔드 웹프로그래머 (Spring, MSA) (4~6년)키트웍스경력 3-7년합격보상금 100만원',
  { company: '키트웍스', experience: '경력 3-7년', reward: '보상금 100만원', title: /웹프로그래머|Spring/ }
);

// === Object input (already structured) ===
test('already-parsed-pass-through',
  { id: '123', title: 'React Dev', company: '카카오', experience: '경력 3년', reward: '보상금 100만원', link: 'https://...' },
  { title: 'React Dev', company: '카카오' }
);

// === Edge cases ===
test('empty-string',
  '',
  { title: '', company: '', experience: '' }
);

test('remote-work-type',
  'Frontend Developer카카오경력 3년 이상전면재택합격보상금 100만원',
  { work_type: 'remote', company: '카카오' }
);

test('hybrid-work-type',
  'Backend Engineer네이버경력 5년 이상하이브리드합격보상금 100만원',
  { work_type: 'hybrid', company: '네이버' }
);

test('english-company-camelcase',
  'React DeveloperVingle경력 2-4년합격보상금 100만원',
  { company: 'Vingle', title: /React/ }
);

test('company-with-english-parens',
  'Sr. Frontend Developer버티고우게임즈 (Vertigo Games)경력 8-15년합격보상금 100만원',
  { company: '버티고우게임즈', reward: '보상금 100만원' }
);

test('career-unlimited',
  '프론트엔드 개발자카카오경력무관합격보상금 70만원',
  { company: '카카오', experience: '경력 무관', reward: '보상금 70만원' }
);

test('number-korean-company',
  'Backend Developer111퍼센트경력 3년 이상합격보상금 100만원',
  { company: '111퍼센트' }
);

test('contract-type-stripped',
  '백엔드 개발자에이엑스경력 5-11년 · 계약직합격보상금 20만원',
  { company: '에이엑스', title: v => !v.includes('계약직') }
);

test('discrimination-react-vs-java-title',
  'Senior Java Developer삼성경력 10년 이상합격보상금 100만원',
  { company: '삼성', title: /Java/ }
);

// === Salary extraction (EXP-057) ===
test('salary-range-wanted',
  '백엔드 개발자카카오경력 5년 이상연봉 5000~8000만원합격보상금 100만원',
  { salary: '연봉 5000~8000만원', company: '카카오', reward: '보상금 100만원' }
);

test('salary-single-value-wanted',
  '프론트엔드 엔지니어네이버경력 3-7년연봉 6000만원 이상합격보상금 100만원',
  { salary: '연봉 6000만원 이상', company: '네이버' }
);

test('salary-negotiable-standalone-wanted',
  'DevOps Engineer라인경력무관면접후결정합격보상금 50만원',
  { salary: '면접후결정', company: '라인', reward: '보상금 50만원', title: v => !v.includes('면접후결정') }
);

test('salary-negotiable-with-prefix-wanted',
  '백엔드 개발자토스경력 3-5년연봉 면접후결정합격보상금 100만원',
  { salary: '연봉 면접후결정', company: '토스' }
);

test('salary-no-leak-to-title',
  '프론트엔드 개발자카카오경력무관연봉 5000~8000만원합격보상금 70만원',
  { salary: '연봉 5000~8000만원', title: v => !v.includes('연봉') && !v.includes('5000') }
);

console.log(`\n📊 Post-Process Wanted: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
