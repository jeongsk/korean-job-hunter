// Post-processing module for raw Wanted scrape data
// Takes raw concatenated text from agent-browser output and applies
// the validated parsing logic to produce clean structured fields.
//
// Usage:
//   node scripts/post-process-wanted.js < input.json > output.json
//   const { parseWantedJob } = require('./scripts/post-process-wanted');

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const CITIES = '(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천|세종|여의도|신촌|홍대|건대)';
const KNOWN_COMPANIES = [
  '카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자',
  '마이플레이스','한컴','네오위즈','넥슨','엔씨소프트','키움','미래엔','웨이브릿지','트리노드','페칭',
  '비댁스','코어셀','키트웍스','더존','쿠팡','스패이드','인터엑스','윙잇','에이엑스',
  '카카오뱅크','카카오페이','토스뱅크','리디','직방','야놀자','무신사','당근',
  '그린랩스','스타일쉐어','버티고우게임즈','제이앤피메디','화해글로벌','유모스원','케이투스코리아',
  '111퍼센트'
];
const TITLE_SUFFIXES = /^(개발자|엔지니어|매니저|디자이너|기획자|분석가|리더|리드|컨설턴트|전문가|디렉터|과장|차장|부장|대리|사원|인턴|정규직|계약직|PD|PM|CTO|CEO|COO|모집|채용|공채|급구|급충|담당|연구원|설계자|운영자)/;

function parseWantedJob(raw) {
  // Handle both single raw text string and structured raw object
  let allText, id, link;
  if (typeof raw === 'string') {
    allText = raw;
    id = ''; link = '';
  } else {
    // If already parsed (has clean title/company), return as-is
    if (raw.title && raw.company && raw.title !== raw.experience) {
      return raw;
    }
    // Use the concatenated text - prefer title field if it contains everything
    allText = raw.title || raw.experience || raw.all_text || '';
    id = raw.id || '';
    link = raw.link || '';
  }

  if (!allText || allText.length < 3) {
    return { id, title: '', company: '', experience: '', salary: '', work_type: 'onsite', location: '', reward: '', skills: '', deadline: '', link };
  }

  let r = { id, title: '', company: '', experience: '', salary: '', work_type: 'onsite', location: '', reward: '', skills: '', deadline: '', link };

  let t = allText;

  // === Work type detection ===
  if (/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|100%\s*remote/i.test(t)) {
    r.work_type = 'remote';
  } else if (/하이브리드|주\d일\s*출근|hybrid/i.test(t)) {
    r.work_type = 'hybrid';
  } else {
    r.work_type = 'onsite';
  }
  t = t.replace(/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|100%\s*remote|하이브리드|주\d일\s*출근|hybrid/gi, ' ');

  // === Location from brackets ===
  const bm = t.match(new RegExp('\\[.*?' + CITIES + '.*?\\]'));
  if (bm) {
    const lm = bm[0].replace(/[\[\]]/g, '').match(new RegExp(CITIES + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?'));
    if (lm) r.location = lm[0].trim();
  }

  // === Extract company from rawCompany pattern (Korean word before 경력) ===
  let rawCompany = null;
  const rcm = allText.match(/([가-힣]+(?:\s*\([^)]+\))?)경력/);
  if (rcm) {
    rawCompany = rcm[1].replace(TITLE_SUFFIXES, '');
    if (rawCompany.length < 2) rawCompany = null;
  }

  // === Extract experience from brackets BEFORE removing them ===
  const bracketExpMatch = t.match(/\[[^\]]*?경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (bracketExpMatch) { r.experience = '경력 ' + bracketExpMatch[1]; }

  // === Pre-segmentation ===
  t = t.replace(/(경력)/g, ' $1').replace(/(합격|보상금|성과금)/g, ' $1').trim();

  // === Remove brackets ===
  t = t.replace(/\[.*?\]/g, '').replace(/\//g, ' ').trim();

  // === Bare location ===
  if (!r.location) {
    const lp = t.match(new RegExp(CITIES + '(?:\\s+[가-힣]{2,3}(?:구|시|군|동))?'));
    if (lp) r.location = lp[0];
  }
  if (r.location) t = t.replace(new RegExp(escapeRegExp(r.location), 'g'), ' ').trim();

  // === Experience ===
  const em = t.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (em) { r.experience = '경력 ' + em[1]; t = t.replace(em[0], ' '); }
  // Also catch standalone 경력무관
  const em2 = t.match(/경력[\s]*무관/);
  if (em2 && !r.experience) { r.experience = '경력 무관'; t = t.replace(em2[0], ' '); }

  // === Reward ===
  const rm = t.match(/(보상금|합격금|성과금)[\s]*(\d+만원)/);
  if (rm) { r.reward = rm[0]; t = t.replace(rm[0], ' '); }

  // === Salary (from detail pages or inline) ===
  const sm = t.match(/(연봉|월급|연수입)[\s]*(\d{1,5}[~-]\d{1,5}만원|\d{1,5}만원\s*이상|면접후결정)/);
  if (sm) { r.salary = sm[0]; t = t.replace(sm[0], ' '); }
  // Standalone 면접후결정 (not preceded by 연봉/월급)
  if (!r.salary) {
    const sm2 = t.match(/면접후결정/);
    if (sm2) { r.salary = '면접후결정'; t = t.replace(sm2[0], ' '); }
  }

  // === Noise cleanup ===
  t = t.replace(/합격/g, ' ').replace(/·/g, ' ').replace(/계약직|정규직|인턴십/g, ' ').trim();

  // === Company extraction ===
  // Try Korean indicators
  let cm = null;
  const kInd = ['㈜', '주식회사', '유한회사', '(주)'];
  // Sort by length DESC for longest match
  kInd.sort((a, b) => b.length - a.length);
  for (const ind of kInd) {
    const m = t.match(new RegExp(escapeRegExp(ind) + '\\s*([^\\s,]+(?:\\s[^\\s,]+)?)'));
    if (m) { cm = m[0]; break; }
  }

  // Try known companies (sort by length DESC)
  if (!cm) {
    const sorted = [...KNOWN_COMPANIES].sort((a, b) => b.length - a.length);
    for (const c of sorted) {
      if (new RegExp(escapeRegExp(c)).test(t)) { cm = c; t = t.replace(c, ' '); break; }
    }
  }

  // Try rawCompany fallback
  if (!cm && rawCompany && rawCompany.length >= 2) {
    cm = rawCompany;
  }

  // Fallback: number+Korean company names (e.g., 111퍼센트)
  if (!cm) { const nk = t.match(/(\d+[가-힣]{2,}(?:\([A-Za-z0-9]+\))?)$/); if (nk) cm = nk[1]; }

  // Fallback: camelCase English company name
  if (!cm) { const cc = t.match(/([a-z])([A-Z][a-z]+)\s*$/); if (cc) cm = t.substring(cc.index + 1).trim(); }

  // Fallback: trailing Korean word that looks like a company (2-6 chars)
  // Block common non-company words that appear in job listings (EXP-055)
  const NOT_COMPANY = /^(모집|채용|공채|경력|신입|리드|담당|급구|급충|정규직|계약직|인턴|임원|사원|연구원|분석가|설계자|기획자|운영자|매니저|디렉터|개발자|엔지니어|프로그래머|디자이너|리더|컨설턴트|전문가|과장|차장|부장|대리|어시스턴트)$/;  if (!cm) {
    const tk = t.match(/([가-힣]{2,6})\s*$/);
    if (tk && !NOT_COMPANY.test(tk[1])) cm = tk[1];
  }

  if (cm) {
    r.company = cm.replace(/^[\s㈜]+/, '').replace(/^\(주\)\s*/, '');
    if (!cm.includes('㈜') && !cm.includes('주식회사') && !cm.includes('(주)')) {
      t = t.replace(new RegExp(escapeRegExp(cm), 'g'), ' ');
    }
  }

  // === Title = whatever remains ===
  r.title = t.replace(/[,·\s]+/g, ' ').trim() || '직무 미상';
  if (!r.company || r.company.length < 2) r.company = '회사명 미상';

  return r;
}

// CLI: read JSON array from stdin, parse each, output to stdout
if (require.main === module) {
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const results = Array.isArray(input) ? input.map(parseWantedJob) : [parseWantedJob(input)];
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  });
}

module.exports = { parseWantedJob, escapeRegExp };
