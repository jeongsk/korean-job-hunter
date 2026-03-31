// EXP-033: Company extraction improvement test
// Hypothesis: In Wanted's concatenated text, company names appear as Korean-only segments
// immediately before the experience marker (경력) or at end of title after parenthetical content.

const testCases = [
  {
    id: "349890",
    raw: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
    expected: { title: "Back-end Developer (Senior)", company: "웨이브릿지" }
  },
  {
    id: "335055",
    raw: "서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원",
    expected: { title: "서버 스토리지 프리세일즈(Pre-sales engineer)", company: "케이투스코리아" }
  },
  {
    id: "342675",
    raw: "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원",
    expected: { title: "GeoAI Platform Backend Engineer (중급/고급)", company: "스패이드" }
  },
  {
    id: "347727",
    raw: "Backend Engineer (Warehouse Management System)유모스원경력 5-15년합격보상금 100만원",
    expected: { title: "Backend Engineer (Warehouse Management System)", company: "유모스원" }
  },
  {
    id: "349886",
    raw: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원",
    expected: { title: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)", company: "페칭" }
  },
  // Known company test (should still work)
  {
    id: "test-known",
    raw: "프론트엔드 개발자카카오경력 3년 이상합격보상금 70만원",
    expected: { title: "프론트엔드 개발자", company: "카카오" }
  },
  // No company indicator test
  {
    id: "test-no-exp",
    raw: "백엔드 개발자㈜삼성SDS",
    expected: { title: "백엔드 개발자", company: "삼성SDS" }
  }
];

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseWantedListingV2(raw) {
  let r = { id: raw.id, title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '', link: raw.link || '' };
  let t = raw.raw;
  
  const cities = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천)';
  
  // Location from brackets
  const bm = t.match(new RegExp(`\\[.*?${cities}.*?\\]`));
  if (bm) {
    const lm = bm[0].replace(/[\[\]]/g, '').match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?'));
    if (lm) r.location = lm[0].trim();
  }
  
  // Work type detection
  if (/전면재택|재택근무|풀리모트|full\s*remote|원격근무|fully\s*remote/i.test(t)) r.work_type = 'remote';
  else if (/하이브리드|주\d일\s*출근|hybrid/i.test(t)) r.work_type = 'hybrid';
  t = t.replace(/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|하이브리드|주\d일\s*출근|hybrid/gi, ' ');
  
  // Pre-segmentation (EXP-023)
  t = t.replace(/(경력)/g, ' $1').replace(/(합격|보상금|성과금)/g, ' $1').trim();
  
  // Remove brackets + slashes
  t = t.replace(/\[.*?\]/g, '').replace(/\//g, ' ').trim();
  
  // Bare location
  if (!r.location) {
    const lp = t.match(new RegExp(cities + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?'));
    if (lp) r.location = lp[0];
  }
  if (r.location) t = t.replace(new RegExp(escapeRegExp(r.location), 'g'), ' ').trim();
  
  // === NEW: Pre-experience company extraction (EXP-033) ===
  // In Wanted's format, company names appear as Korean-only segments
  // right before the 경력 marker. Must run BEFORE experience extraction!
  
  let preExpCompany = null;
  const expMarkerIdx = t.indexOf(' 경력');
  if (expMarkerIdx > 0) {
    const beforeExp = t.substring(0, expMarkerIdx).trimEnd();
    // Walk backwards to find Korean-only run (company name)
    let companyStart = beforeExp.length;
    for (let i = beforeExp.length - 1; i >= 0; i--) {
      const ch = beforeExp[i];
      if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(ch)) {
        companyStart = i;
      } else {
        break;
      }
    }
    if (companyStart < beforeExp.length) {
      const candidate = beforeExp.substring(companyStart);
      if (candidate.length >= 2) {
        preExpCompany = candidate;
        t = beforeExp.substring(0, companyStart) + t.substring(expMarkerIdx);
      }
    }
  }
  
  // Experience
  const em = t.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' ').trim(); }
  
  // Reward
  const rm = t.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' ').trim(); }
  
  // Noise cleanup
  t = t.replace(/합격/g, ' ').replace(/[·•]/g, ' ').replace(/계약직/g, ' ').trim();
  
  // Company extraction - indicators (existing logic)
  let cm = null;
  const kInd = ['㈜', '주식회사', '유한회사'];
  for (const ind of kInd) {
    const m = t.match(new RegExp(escapeRegExp(ind) + '\\s*([^\\s,]+(?:\\s[^\\s,]+)?)'));
    if (m) { cm = m[0]; break; }
  }
  
  // Company extraction - known companies
  if (!cm) {
    const known = ['카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스', '당근마켓', '크몽', '야놀자', '마이플레이스', '한컴', '네오위즈', '넥슨', '엔씨소프트', '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '비댁스', '코어셀', '키트웍스', '더존', '쿠팡'];
    for (const c of known) {
      if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; }
    }
  }
  
  // Use pre-experience company if no other method found it
  if (!cm && preExpCompany && preExpCompany.length >= 2) {
    cm = preExpCompany;
  }
  
  if (cm) {
    r.company = cm.replace(/^[\s㈜]+/, '');
    if (r.company.includes('주식회사')) r.company = r.company.replace('주식회사', '').trim();
    if (!cm.includes('㈜') && !cm.includes('주식회사')) {
      t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' ');
    }
  }
  
  // Final cleanup: remove 경력 from title (if still there from v2 logic)
  t = t.replace(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|무관)?/g, ' ').trim();
  t = t.replace(/합격/g, ' ').trim();
  t = t.replace(/[,·\s]+/g, ' ').trim();
  
  r.title = t || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';
  
  return r;
}

// Run tests
console.log('=== EXP-033: Company Extraction Improvement ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = parseWantedListingV2({ id: tc.id, raw: tc.raw });
  const titleOk = result.title.includes(tc.expected.title.split('(')[0].trim().substring(0, 10));
  const companyOk = result.company === tc.expected.company || result.company.includes(tc.expected.company);
  
  const status = (titleOk && companyOk) ? '✅' : '❌';
  console.log(`${status} ID ${tc.id}`);
  console.log(`  Title:   "${result.title}" (expected contains: "${tc.expected.title.substring(0, 30)}...")`);
  console.log(`  Company: "${result.company}" (expected: "${tc.expected.company}")`);
  if (result.experience) console.log(`  Experience: ${result.experience}`);
  if (result.reward) console.log(`  Reward: ${result.reward}`);
  console.log();
  
  if (titleOk && companyOk) passed++;
  else failed++;
}

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
process.exit(failed > 0 ? 1 : 0);
