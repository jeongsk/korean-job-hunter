// Extended E2E parsing test with more real data patterns
// Also tests: title-company boundary detection, parenthetical experience, edge cases
// EXP-056: Unified to import production parser from post-process-wanted.js

const { parseWantedJob } = require('./scripts/post-process-wanted');

const testCases = [
  // Standard patterns
  { raw: "[전문연구요원] Frontend Developer인터엑스경력 2-12년합격보상금 100만원", expect: { company: "인터엑스", exp: "경력 2-12년", reward: "보상금 100만원" } },
  { raw: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원", expect: { company: "페칭", exp: "경력 8년 이상", reward: "보상금 100만원" } },
  { raw: "풀스택 개발자 (4년 이상)윙잇경력 4-8년합격보상금 100만원", expect: { company: "윙잇", exp: "경력 4-8년", reward: "보상금 100만원" } },
  { raw: "AI 서비스 프론트 개발자111퍼센트경력 3년 이상합격보상금 100만원", expect: { company: "111퍼센트", exp: "경력 3년 이상", reward: "보상금 100만원" } },
  { raw: "프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원", expect: { company: "에이엑스", exp: "경력 3-10년", reward: "보상금 100만원" } },
  // Edge: title has parentheses, company is unknown
  { raw: "백엔드 개발자(Java/Spring)(주)ABC소프트경력 5년 이상합격보상금 500,000원", expect: { company: "ABC소프트", exp: "경력 5년 이상" } },
  // Edge: 신입 (no experience range)
  { raw: "프론트엔드 개발자카카오경력무관합격보상금 70만원", expect: { company: "카카오", exp: "경력 무관", reward: "보상금 70만원" } },
];

let passed = 0, failed = 0;
for (const tc of testCases) {
  const r = parseWantedJob(tc.raw);
  const expOk = r.experience === tc.expect.exp;
  const rewOk = !tc.expect.reward || r.reward === tc.expect.reward;
  const compOk = r.company === tc.expect.company;
  const ok = expOk && rewOk && compOk;
  console.log(`${ok ? '✅' : '❌'} "${tc.raw.substring(0,50)}..." → company:${r.company} exp:${r.experience} reward:${r.reward}`);
  if (!ok) console.log(`   Expected: company:${tc.expect.company} exp:${tc.expect.exp} reward:${tc.expect.reward||'any'}`);
  if (!ok) console.log(`   Got:      company:${r.company} exp:${r.experience} reward:${r.reward}`);
  ok ? passed++ : failed++;
}
console.log(`\nResults: ${passed}/${passed+failed}`);
if (failed > 0) process.exit(1);
