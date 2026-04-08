#!/usr/bin/env node
// Live Wanted scraping validation - tests extraction code against real data from agent-browser
// EXP-056: Unified to import production parser from post-process-wanted.js

const { parseWantedJob } = require('./scripts/post-process-wanted');

const liveData = [
  { id: "349886", raw: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원", link: "https://www.wanted.co.kr/wd/349886" },
  { id: "351215", raw: "프론트엔드 개발자(3~5년)랭디경력 3-5년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/351215" },
  { id: "344280", raw: "[전문연구요원] Frontend Developer인터엑스경력 2-12년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/344280" },
  { id: "347792", raw: "프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/347792" },
  { id: "350087", raw: "[메가존] 프론트엔드(F/E) 개발자 (시니어 급)디피니션경력 7-10년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/350087" },
  { id: "343393", raw: "풀스택 개발자룰루랩(lululab)경력 3-5년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/343393" },
  { id: "351042", raw: "Frontend Developer화해글로벌경력 4-10년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/351042" },
  { id: "291970", raw: "Senior Front-end Software Engineer제이앤피메디(JNPMEDI)경력 8-30년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/291970" },
  // EXP-040: space between Korean company and English parenthetical name
  { id: "EXP040", raw: "Sr. Frontend Developer버티고우게임즈 (Vertigo Games)경력 8-15년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/EXP040" },
  // EXP-150: experience context contaminating rawCompany (이상 stuck to company name)
  { id: "EXP150A", raw: "서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원", link: "https://www.wanted.co.kr/wd/EXP150A" },
  { id: "EXP150B", raw: "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원", link: "https://www.wanted.co.kr/wd/EXP150B" },
  { id: "EXP150C", raw: "Backend Engineer (Warehouse Management System)유모스원경력 5-15년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/EXP150C" },
];

// Expected results based on manual inspection
const expected = [
  { id: "349886", company: "페칭", experience: "경력 8년 이상", title_includes: "CTO" },
  { id: "351215", company: "랭디", experience: "경력 3-5년", title_includes: "프론트엔드" },
  { id: "344280", company: "인터엑스", experience: "경력 2-12년", title_includes: "Frontend" },
  { id: "347792", company: "에이엑스", experience: "경력 3-10년", title_includes: "프론트엔드" },
  { id: "350087", company: "디피니션", experience: "경력 7-10년", title_includes: "프론트엔드" },
  { id: "343393", company: "룰루랩", experience: "경력 3-5년", title_includes: "풀스택" },
  { id: "351042", company: "화해글로벌", experience: "경력 4-10년", title_includes: "Frontend" },
  { id: "291970", company: "제이앤피메디", experience: "경력 8-30년", title_includes: "Senior" },
  { id: "EXP040", company: "버티고우게임즈", experience: "경력 8-15년", title_includes: "Sr." },
  { id: "EXP150A", company: "케이투스코리아", experience: "경력 5-11년", title_includes: "프리세일즈" },
  { id: "EXP150B", company: "스패이드", experience: "경력 4년 이상", title_includes: "Backend" },
  { id: "EXP150C", company: "유모스원", experience: "경력 5-15년", title_includes: "Backend" },
];

let passed = 0, failed = 0;
const results = [];

for (const item of liveData) {
  // Production parser accepts string or object with 'title' field containing raw text
  const parsed = parseWantedJob({ id: item.id, title: item.raw, link: item.link });
  const exp = expected.find(e => e.id === item.id);

  const companyOk = parsed.company === exp.company || parsed.company.includes(exp.company.split('(')[0]);
  const expOk = parsed.experience === exp.experience;
  const titleOk = parsed.title.includes(exp.title_includes);
  const rewardOk = parsed.reward.includes('보상금') && parsed.reward.includes('만원');

  const allOk = companyOk && expOk && titleOk && rewardOk;
  if (allOk) passed++;
  else failed++;

  results.push({ ...parsed, _checks: { companyOk, expOk, titleOk, rewardOk } });
  if (!allOk) {
    console.log(`❌ FAIL ${item.id}: company=${parsed.company}(${companyOk}) exp=${parsed.experience}(${expOk}) title="${parsed.title}"(${titleOk}) reward=${parsed.reward}(${rewardOk})`);
  }
}

console.log(`\n📊 Live Wanted Parsing: ${passed}/${passed+failed} passed`);
results.forEach(r => console.log(`  ${r.id}: "${r.title}" @ ${r.company} | ${r.experience} | ${r.reward}`));

process.exit(failed > 0 ? 1 : 0);
