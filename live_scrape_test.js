// Live scraping test - validates SKILL.md eval code against real Wanted data
const fs = require('fs');

// Simulate the raw data we got from the live scrape
const liveRawData = [
  { id: "349890", raw_text: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/349890" },
  { id: "335055", raw_text: "서버 스토리지 프리세일즈(Pre-sales engineer) 기술영업 5년 이상케이투스코리아경력 5-11년 · 계약직합격보상금 20만원", link: "https://www.wanted.co.kr/wd/335055" },
  { id: "342675", raw_text: "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원", link: "https://www.wanted.co.kr/wd/342675" },
  { id: "347727", raw_text: "Backend Engineer (Warehouse Management System)유모스원경력 5-15년합격보상금 100만원", link: "https://www.wanted.co.kr/wd/347727" },
  { id: "349886", raw_text: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원", link: "https://www.wanted.co.kr/wd/349886" }
];

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseWantedListing(raw) {
  let r = { id: raw.id, title: '', company: '', experience: '', reward: '', work_type: 'onsite', location: '', link: raw.link };
  let t = raw.raw_text;
  
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
  
  // Experience (supports ~ and - ranges)
  const em = t.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' ').trim(); }
  
  // Reward
  const rm = t.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' ').trim(); }
  
  // Noise cleanup: standalone 합격
  t = t.replace(/합격/g, ' ').trim();
  
  // Company extraction - indicators
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
  
  if (cm) {
    r.company = cm.replace(/^[\s㈜]+/, '');
    if (!cm.includes('㈜') && !cm.includes('주식회사')) t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' ');
  }
  
  r.title = t.replace(/[,·\s]+/g, ' ').trim() || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';
  
  return r;
}

// Run tests
console.log('=== Live Wanted Scrape Parsing Test ===\n');

let passed = 0;
let failed = 0;
const issues = [];

for (const raw of liveRawData) {
  const result = parseWantedListing(raw);
  console.log(`ID: ${result.id}`);
  console.log(`  Title: ${result.title}`);
  console.log(`  Company: ${result.company}`);
  console.log(`  Experience: ${result.experience}`);
  console.log(`  Reward: ${result.reward}`);
  console.log(`  Work Type: ${result.work_type}`);
  console.log(`  Location: ${result.location}`);
  console.log();
  
  // Validate fields
  if (!result.title || result.title === '직무 미상') {
    issues.push(`ID ${result.id}: title is missing/default`);
    failed++;
  } else if (!result.company || result.company === '회사명 미상') {
    issues.push(`ID ${result.id}: company is missing/default`);
    failed++;
  } else if (!result.experience) {
    issues.push(`ID ${result.id}: experience is missing`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`\n=== Results: ${passed}/${passed + failed} jobs fully parsed ===`);
if (issues.length > 0) {
  console.log('\nIssues found:');
  issues.forEach(i => console.log(`  ⚠️ ${i}`));
}

// Additional validation: check for leftover noise in titles
console.log('\n=== Title Cleanliness Check ===');
for (const raw of liveRawData) {
  const result = parseWantedListing(raw);
  const noisePatterns = ['합격', '보상금', '경력'];
  const hasNoise = noisePatterns.some(p => result.title.includes(p));
  if (hasNoise) {
    console.log(`  ⚠️ ID ${result.id}: title contains noise "${result.title}"`);
    failed++;
  } else {
    passed++;
  }
}
console.log(`Title cleanliness: ${passed} clean, ${failed} with noise`);

process.exit(failed > 0 ? 1 : 0);
