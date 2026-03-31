#!/usr/bin/env node
// Live Wanted scraping validation - tests extraction code against real data from agent-browser
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
];

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseWantedJob(raw) {
  let r = { id: raw.id, title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '', link: raw.link };
  let t = raw.raw;
  const cities = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천)';

  // Location from brackets
  const bm = t.match(new RegExp(`\\[.*?${cities}.*?\\]`));
  if (bm) { const lm = bm[0].replace(/[\[\]]/g, '').match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?')); if (lm) r.location = lm[0].trim(); }

  // Work type
  if (/전면재택|재택근무|풀리모트|full\s*remote|원격근무|fully\s*remote/i.test(t)) r.work_type = 'remote';
  else if (/하이브리드|주\d일\s*출근|hybrid/i.test(t)) r.work_type = 'hybrid';
  t = t.replace(/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|하이브리드|주\d일\s*출근|hybrid/gi, ' ');

  // EXP-037: Extract company from ORIGINAL raw text before any processing.
  // In Wanted raw, company is the Korean text (+optional English parens) immediately before '경력'
  // Strip known job title suffixes (개발자, 엔지니어 etc.) from the front.
  let companyFromRaw = null;
  const rawCompanyMatch = t.match(/([가-힣]+(?:\s*\([^)]+\))?)경력/);
  if (rawCompanyMatch) {
    companyFromRaw = rawCompanyMatch[1].replace(/^(개발자|엔지니어|매니저|디자이너|기획자|분석가|리더|컨설턴트|전문가|디렉터|과장|차장|부장|대리|사원|인턴|PD|PM|CTO|CEO|COO)/, '');
    if (companyFromRaw.length < 2) companyFromRaw = null;
  }

  // Pre-segmentation
  t = t.replace(/(경력)/g, ' $1').replace(/(합격|보상금|성과금)/g, ' $1').trim();

  // Remove brackets
  t = t.replace(/\[.*?\]/g, '').replace(/\//g, ' ').trim();

  // Bare location
  if (!r.location) { const lp = t.match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?')); if (lp) r.location = lp[0]; }
  if (r.location) t = t.replace(new RegExp(escapeRegExp(r.location), 'g'), ' ').trim();

  // Experience
  const em = t.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' ').trim(); }

  // Reward
  const rm = t.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' ').trim(); }

  // Noise cleanup
  t = t.replace(/합격/g, ' ').trim();

  // Company extraction (EXP-037: experience-marker proximity)
  let cm = null;
  const kInd = ['㈜', '주식회사', '유한회사', '(주)'];
  for (const ind of kInd) { const m = t.match(new RegExp(escapeRegExp(ind) + '\\s*([^\\s,]+(?:\\s[^\\s,]+)?)')); if (m) { cm = m[0]; break; } }
  if (!cm) {
    const known = ['카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자','마이플레이스','한컴','네오위즈','넥슨','엔씨소프트','키움','미래엔','웨이브릿지','트리노드','페칭','비댁스','코어셀','키트웍스','더존','쿠팡'];
    for (const c of known) { if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; } }
  }
  // EXP-037: experience-marker proximity — use company extracted from raw text
  if (!cm && companyFromRaw) {
    cm = companyFromRaw;
  }
  if (cm) { r.company = cm.replace(/^[\s㈜]+/, '').replace(/^\(주\)\s*/, ''); if (!cm.includes('㈜') && !cm.includes('주식회사') && !cm.includes('(주)')) t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' '); }
  r.title = t.replace(/[,·\s]+/g, ' ').trim() || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';
  return r;
}

// Expected results based on manual inspection
const expected = [
  { id: "349886", company: "페칭", experience: "경력 8년 이상", title_includes: "CTO" },
  { id: "351215", company: "랭디", experience: "경력 3-5년", title_includes: "프론트엔드" },
  { id: "344280", company: "인터엑스", experience: "경력 2-12년", title_includes: "Frontend" },
  { id: "347792", company: "에이엑스", experience: "경력 3-10년", title_includes: "프론트엔드" },
  { id: "350087", company: "디피니션", experience: "경력 7-10년", title_includes: "프론트엔드" },
  { id: "343393", company: "룰루랩", experience: "경력 3-5년", title_includes: "풀스택" },  // company from parentheses
  { id: "351042", company: "화해글로벌", experience: "경력 4-10년", title_includes: "Frontend" },
  { id: "291970", company: "제이앤피메디", experience: "경력 8-30년", title_includes: "Senior" },  // company in parentheses
  { id: "EXP040", company: "버티고우게임즈", experience: "경력 8-15년", title_includes: "Sr." },  // EXP-040: space before English parens
];

let passed = 0, failed = 0;
const results = [];

for (const raw of liveData) {
  const parsed = parseWantedJob(raw);
  const exp = expected.find(e => e.id === raw.id);

  const companyOk = parsed.company === exp.company || parsed.company.includes(exp.company.split('(')[0]);
  const expOk = parsed.experience === exp.experience;
  const titleOk = parsed.title.includes(exp.title_includes);
  const rewardOk = parsed.reward.includes('보상금') && parsed.reward.includes('만원');

  const allOk = companyOk && expOk && titleOk && rewardOk;
  if (allOk) passed++;
  else failed++;

  results.push({ ...parsed, _checks: { companyOk, expOk, titleOk, rewardOk } });
  if (!allOk) {
    console.log(`❌ FAIL ${raw.id}: company=${parsed.company}(${companyOk}) exp=${parsed.experience}(${expOk}) title="${parsed.title}"(${titleOk}) reward=${parsed.reward}(${rewardOk})`);
  }
}

console.log(`\n📊 Live Wanted Parsing: ${passed}/${passed+failed} passed`);
results.forEach(r => console.log(`  ${r.id}: "${r.title}" @ ${r.company} | ${r.experience} | ${r.reward}`));

process.exit(failed > 0 ? 1 : 0);
