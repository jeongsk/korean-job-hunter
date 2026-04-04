// EXP-069: JobKorea salary normalization pipeline tests
// Verifies that post-process-jobkorea.js correctly normalizes salary_min/salary_max
// for all JobKorea salary patterns (annual, monthly, single, negotiable, 억).

const { parseJobKoreaCard } = require('./scripts/post-process-jobkorea');

const tests = [
  // Unit: annual range
  {
    name: "annual-range-min-max",
    raw: "백엔드 개발자\n㈜카카오\n경력 3~10년\n연봉 5000~8000만원\n서울 영등포구",
    check: r => r.salary_min === 5000 && r.salary_max === 8000,
    desc: "연봉 5000~8000만원 → min:5000, max:8000"
  },
  // Unit: monthly range (→ annual)
  {
    name: "monthly-range-annualized",
    raw: "프론트엔드 개발자\n주식회사토스\n경력 5년 이상\n월급 300~500만원\n서울 강남구",
    check: r => r.salary_min === 3600 && r.salary_max === 6000,
    desc: "월급 300~500만원 → min:3600, max:6000 (×12)"
  },
  // Unit: single value
  {
    name: "single-value",
    raw: "데이터 엔지니어\n(주)네이버\n경력 3년 이상\n연봉 6000만원 이상\n경기 성남시 분당구",
    check: r => r.salary_min === 6000 && r.salary_max === 6000,
    desc: "연봉 6000만원 이상 → min:6000, max:6000"
  },
  // Unit: negotiable → null
  {
    name: "negotiable-null",
    raw: "iOS 개발자\n토스뱅크\n경력 3년 이상\n면접후결정\n서울 송파구",
    check: r => r.salary_min === null && r.salary_max === null,
    desc: "면접후결정 → null"
  },
  // Unit: no salary field
  {
    name: "no-salary",
    raw: "DevOps 엔지니어\n(주)당근마켓\n경력 5년 이상\n서울 마포구",
    check: r => r.salary_min === null && r.salary_max === null && r.salary === '',
    desc: "No salary → salary_min/max null"
  },
  // Unit: 억 range
  {
    name: "eok-range",
    raw: "CTO\n카카오\n경력 10년 이상\n연봉 1~2억\n서울 영등포구",
    check: r => r.salary_min === 10000 && r.salary_max === 20000,
    desc: "연봉 1~2억 → min:10000, max:20000"
  },
  // Integration: title/company/location correct alongside salary
  {
    name: "full-extraction-with-salary",
    raw: "백엔드 개발자\n(주)네이버\n경력 3~10년\n연봉 5000~8000만원\n경기 성남시 분당구\n마감일 2026.04.15",
    check: r =>
      r.title === "백엔드 개발자" &&
      r.company === "네이버" &&
      r.experience === "경력 3~10년" &&
      r.location === "경기 성남시 분당구" &&
      r.deadline.includes("2026-04-15") &&
      r.salary_min === 5000 &&
      r.salary_max === 8000 &&
      r.source === 'jobkorea',
    desc: "All fields extracted correctly with salary normalized"
  },
  // Edge: company prefix stripped
  {
    name: "company-prefix-stripped",
    raw: "데이터 엔지니어\n주식회사토스\n경력무관\n서울 강남구",
    check: r => r.company === "토스",
    desc: "주식회사 prefix stripped"
  },
  // Edge: English company
  {
    name: "english-company",
    raw: "Full-Stack Developer\nGoogle Korea\n경력 5년 이상\n서울 강남구",
    check: r => r.company === "Google Korea",
    desc: "English company name preserved"
  },
  // Unit: monthly single value
  {
    name: "monthly-single-annualized",
    raw: "디자이너\n스타트업\n경력 2년 이상\n월급 400만원\n서울 마포구",
    check: r => r.salary_min === 4800 && r.salary_max === 4800,
    desc: "월급 400만원 → min:4800, max:4800 (×12)"
  },
  // Edge: 신입 (entry level)
  {
    name: "entry-level-no-salary",
    raw: "프론트엔드 개발자\n㈜라인\n신입\n서울 영등포구",
    check: r => r.experience === "신입" && r.salary_min === null,
    desc: "신입 experience, no salary"
  },
  // Edge: title with career keyword
  {
    name: "title-with-career-keyword",
    raw: "경력 IT 컨설턴트\n(주)삼성SDS\n경력 10년 이상\n서울 중구",
    check: r => r.title === "경력 IT 컨설턴트" && r.experience === "경력 10년 이상",
    desc: "Title contains 경력 but correctly classified"
  },
];

let passed = 0, failed = 0;
const failures = [];

for (const tc of tests) {
  const result = parseJobKoreaCard(tc.raw);
  if (tc.check(result)) {
    passed++;
    console.log(`✅ ${tc.name}: ${tc.desc}`);
  } else {
    failed++;
    failures.push(tc.name);
    console.log(`❌ ${tc.name}: ${tc.desc}`);
    console.log(`   Got: ${JSON.stringify(result, null, 2)}`);
  }
}

console.log(`\n${passed}/${passed + failed} JobKorea salary pipeline tests passed`);
if (failures.length) { console.log(`Failed: ${failures.join(', ')}`); process.exit(1); }
