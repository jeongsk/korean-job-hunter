#!/usr/bin/env node
// Test parsing against real live Wanted data
// EXP-056: Unified to import production parser from post-process-wanted.js

const { parseWantedJob } = require('./scripts/post-process-wanted');

// Live data from actual Wanted scraping (2026-03-31)
const liveData = [
  '글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원',
  '프론트엔드 개발자(3~5년)랭디경력 3-5년합격보상금 100만원',
  '[메가존] 프론트엔드(F/E) 개발자 (시니어 급)디피니션경력 7-10년합격보상금 100만원',
  '프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원',
  '[전문연구요원] Frontend Developer인터엑스경력 2-12년합격보상금 100만원',
  'Senior Front-end Software Engineer제이앤피메디(JNPMEDI)경력 8-30년합격보상금 100만원',
  '풀스택 개발자룰루랩(lululab)경력 3-5년합격보상금 100만원',
  'Sr. Frontend Developer버티고우게임즈 (Vertigo Games)경력 8-15년합격보상금 100만원',
];

console.log('=== Live Wanted Parsing Test ===\n');
let pass = 0, fail = 0;
const expected = [
  { company: '페칭', titleContains: 'CTO' },
  { company: '랭디', titleContains: '프론트엔드' },
  { company: '디피니션', titleContains: '프론트엔드' },
  { company: '에이엑스', titleContains: '프론트엔드' },
  { company: '인터엑스', titleContains: 'Frontend' },
  { company: '제이앤피메디', titleContains: 'Senior' },
  { company: '룰루랩', titleContains: '풀스택' },
  { company: '버티고우게임즈', titleContains: 'Sr.' },
];

for (let i = 0; i < liveData.length; i++) {
  const r = parseWantedJob(liveData[i]);
  const exp = expected[i];
  const companyOk = r.company.includes(exp.company) || exp.company.includes(r.company);
  const titleOk = r.title.includes(exp.titleContains);
  const ok = companyOk && titleOk;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '✅' : '❌'} company="${r.company}" title="${r.title}" exp="${r.experience}" reward="${r.reward}"`);
  if (!ok) console.log(`   Expected: company ~${exp.company}, title contains ${exp.titleContains}`);
}
console.log(`\n${pass}/${pass+fail} passed`);
if (fail > 0) process.exit(1);
