#!/usr/bin/env node
// Test: company extraction using Korean/English boundary detection before 경력
// Key insight: Company names are typically pure Korean, while titles often end with English/punctuation
// In raw Wanted text: [title][company]경력... where title and company are concatenated

const testCases = [
  { raw: "글로벌 파션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원", expect: { company: "페칭", title_includes: "CTO" } },
  { raw: "프론트엔드 개발자(3~5년)랭디경력 3-5년합격보상금 100만원", expect: { company: "랭디", title_includes: "프론트엔드" } },
  { raw: "[전문연구요원] Frontend Developer인터엑스경력 2-12년합격보상금 100만원", expect: { company: "인터엑스", title_includes: "Frontend" } },
  { raw: "프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원", expect: { company: "에이엑스", title_includes: "프론트엔드" } },
  { raw: "[메가존] 프론트엔드(F/E) 개발자 (시니어 급)디피니션경력 7-10년합격보상금 100만원", expect: { company: "디피니션", title_includes: "프론트엔드" } },
  { raw: "풀스택 개발자룰루랩(lululab)경력 3-5년합격보상금 100만원", expect: { company: "룰루랩", title_includes: "풀스택" } },
  { raw: "Frontend Developer화해글로벌경력 4-10년합격보상금 100만원", expect: { company: "화해글로벌", title_includes: "Frontend" } },
  { raw: "Senior Front-end Software Engineer제이앤피메디(JNPMEDI)경력 8-30년합격보상금 100만원", expect: { company: "제이앤피메디", title_includes: "Senior" } },
  { raw: "백엔드 개발자카카오경력 5년 이상합격보상금 100만원", expect: { company: "카카오", title_includes: "백엔드" } },
  { raw: "백엔드 개발자(주)ABC소프트경력 5년 이상합격보상금 100만원", expect: { company: "ABC소프트", title_includes: "백엔드" } },
  { raw: "React DeveloperVingle경력 3년 이상합격보상금 70만원", expect: { company: "Vingle", title_includes: "React" } },
  // Additional edge cases
  { raw: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원", expect: { company: "웨이브릿지", title_includes: "Back-end" } },
  { raw: "서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원", expect: { company: "케이투스코리아", title_includes: "프리세일즈" } },
  { raw: "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원", expect: { company: "스패이드", title_includes: "Backend" } },
  { raw: "AI 서비스 프론트 개발자111퍼센트경력 3년 이상합격보상금 100만원", expect: { company: "111퍼센트", title_includes: "프론트" } },
  { raw: "프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원", expect: { company: "에이엑스", title_includes: "프론트엔드" } },
];

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Extract company using the boundary between title and company in raw Wanted text
// Pattern: the company name starts at the last "word boundary" before 경력
// The company is typically: pure Korean, or Korean+English(parens), or pure English after Korean title
function extractCompanyFromBoundary(workingText) {
  // Find text before 경력 (after pre-segmentation, 경력 has a space before it)
  const beforeExp = workingText.split(/\s+경력/)[0];
  if (!beforeExp) return null;

  // Strategy: extract the last "company-like" segment from the text before 경력
  // Company patterns at the end of beforeExp:
  // 1. Korean word: 페칭, 랭디, 에이엑스, 디피니션, 화해글로벌
  // 2. Korean + (English): 룰루랩(lululab), 제이앤피메디(JNPMEDI)  
  // 3. Pure Korean after English: ...Developer화해글로벌
  // 4. Korean after parenthesized English: ...Officer)페칭
  // 5. Pure English after space: Vingle (after "Developer")

  // Match from end of beforeExp:
  // Korean+(English)? OR pure English (if preceded by space or non-Korean)
  // Also match number+Korean (e.g., 111퍼센트) — EXP-037
  const companyMatch = beforeExp.match(
    /(\d*[가-힣]{2,}(?:\([A-Za-z0-9]+\))?)$|([A-Za-z]{2,})$/
  );

  if (companyMatch) {
    return companyMatch[1] || companyMatch[2] || null;
  }

  // Fallback: try matching number+Korean (e.g., 111퍼센트)
  const numKorean = beforeExp.match(/(\d+[가-힣]+(?:\([A-Za-z0-9]+\))?)$/);
  if (numKorean) return numKorean[1];

  return null;
}

function parseWantedJob(raw) {
  let r = { title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '' };
  let t = raw;
  const cities = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천)';

  const bm = t.match(new RegExp(`\\[.*?${cities}.*?\\]`));
  if (bm) { const lm = bm[0].replace(/[\[\]]/g, '').match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?')); if (lm) r.location = lm[0].trim(); }

  if (/전면재택|재택근무|풀리모트|full\s*remote|원격근무|fully\s*remote/i.test(t)) r.work_type = 'remote';
  else if (/하이브리드|주\d일\s*출근|hybrid/i.test(t)) r.work_type = 'hybrid';
  t = t.replace(/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|하이브리드|주\d일\s*출근|hybrid/gi, ' ');

  // Pre-segmentation
  t = t.replace(/(경력)/g, ' $1').replace(/(합격|보상금|성과금)/g, ' $1').trim();

  // Extract company BEFORE removing brackets (boundary detection works better on pre-segmented text)
  let companyCandidate = extractCompanyFromBoundary(t);

  t = t.replace(/\[.*?\]/g, '').replace(/\//g, ' ').trim();

  if (!r.location) { const lp = t.match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?')); if (lp) r.location = lp[0]; }
  if (r.location) t = t.replace(new RegExp(escapeRegExp(r.location), 'g'), ' ').trim();

  const em = t.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' ').trim(); }

  const rm = t.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' ').trim(); }

  t = t.replace(/합격/g, ' ').trim();

  // Company extraction - existing strategies
  let cm = null;
  const kInd = ['㈜', '주식회사', '유한회사', '(주)'];
  for (const ind of kInd) { const m = t.match(new RegExp(escapeRegExp(ind) + '\\s*([^\\s,]+(?:\\s[^\\s,]+)?)')); if (m) { cm = m[0]; break; } }
  if (!cm) {
    const known = ['카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자','마이플레이스','한컴','네오위즈','넥슨','엔씨소프트','키움','미래엔','웨이브릿지','트리노드','페칭','비댁스','코어셀','키트웍스','더존','쿠팡'];
    for (const c of known) { if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; } }
  }

  // NEW: Boundary-based company fallback
  if (!cm && companyCandidate) {
    cm = companyCandidate;
    // Clean up: remove English parenthetical from display (keep for matching)
    const displayName = cm.replace(/\([A-Za-z0-9]+\)$/, '');
    // Remove from title text
    t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' ').trim();
    cm = displayName;
  }

  if (cm) {
    r.company = cm.replace(/^[\s㈜]+/, '').replace(/^\(주\)\s*/, '');
    if (!cm.includes('㈜') && !cm.includes('주식회사') && !cm.includes('(주)')) {
      t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' ');
    }
  }
  r.title = t.replace(/[,·\s]+/g, ' ').trim() || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';
  return r;
}

let passed = 0, failed = 0;
for (const tc of testCases) {
  const result = parseWantedJob(tc.raw);
  const companyOk = result.company.includes(tc.expect.company);
  const titleOk = result.title.includes(tc.expect.title_includes);
  const ok = companyOk && titleOk;
  if (ok) passed++; else failed++;
  const status = ok ? '✅' : '❌';
  console.log(`${status} company="${result.company}"(expect:${tc.expect.company},${companyOk}) title="${result.title}"(${titleOk})`);
}
console.log(`\n📊 ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
