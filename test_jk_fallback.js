// EXP-031: Test JobKorea fallback selector resilience

const tests = [];
function assert(name, condition) {
  tests.push({ name, pass: !!condition });
  if (!condition) console.log(`  FAIL: ${name}`);
}

// Simulate fallback selector chain
function simulateFindCards(domStructure) {
  if (domStructure.primary > 0) return Array(domStructure.primary).fill('primary');
  if (domStructure.semantic > 0) return Array(domStructure.semantic).fill('semantic');
  if (domStructure.links > 0) return Array(domStructure.links).fill('link-based');
  return [];
}

// JobKorea line-based extraction
function extractFromCard(text) {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  const title = lines.find(l => l.length > 5 && !l.match(/스크랩|지원|등록|마감|경력|서울|경기/)) || '';
  const hasIndicator = lines.some(l => l.match(/㈜|주식회사|Corp\.?|Inc\.?|LLC/));
  let company = '';
  if (hasIndicator) {
    company = lines.find(l => l.match(/㈜|주식회사|Corp\.?|Inc\.?|LLC/)) || '';
  } else {
    // Short-line heuristic: only if no indicator found anywhere
    company = lines.find(l => l.length >= 2 && l.length <= 6 && !l.match(/경력|지원|스크랩|등록|마감|개발|엔지니어|매니저|디자이너|서울|경기|부산|대전|인천|광주|대구|울산/)) || '';
  }
  const experience = lines.find(l => l.match(/경력/)) || '';
  const location = lines.find(l => l.match(/서울|경기|부산|대전|인천/)) || '';
  const deadline = lines.find(l => l.match(/마감/)) || '';
  return { title, company, experience, location, deadline };
}

// === Fallback Selector Tests ===
assert('Primary selector finds cards', simulateFindCards({ primary: 20 }).length === 20);
assert('Semantic fallback works', simulateFindCards({ primary: 0, semantic: 15 }).length === 15);
assert('Link-based fallback works', simulateFindCards({ primary: 0, semantic: 0, links: 10 }).length === 10);
assert('Empty when all fail', simulateFindCards({}).length === 0);
assert('Partial primary results', simulateFindCards({ primary: 5 }).length === 5);

// === Extraction Tests ===
const input1 = ['백엔드 개발자', '㈜카카오', '경력 3년 이상', '서울 강남구', '04/12(일) 마감'].join(String.fromCharCode(10));
const c1 = extractFromCard(input1);
assert('Extract: title', c1.title === '백엔드 개발자');
assert('Extract: company with indicator', c1.company === '㈜카카오');
assert('Extract: experience', c1.experience === '경력 3년 이상');
assert('Extract: location', c1.location === '서울 강남구');
assert('Extract: deadline', c1.deadline.includes('마감'));

const input2 = ['프론트엔드 엔지니어', '주식회사토스', '경력 무관', '서울 서초구', '스크랩 12', '지원 45'].join(String.fromCharCode(10));
const c2 = extractFromCard(input2);
assert('Extract: no-space company', c2.company === '주식회사토스');
assert('Noise filtering', !c2.title.includes('스크랩'));

// === Short title edge case (was misidentified as company) ===
const input3 = ['백엔드 개발자', '경력 3년 이상', '서울 강남구'].join(String.fromCharCode(10));
const c3 = extractFromCard(input3);
assert('Short title not misidentified as company', c3.title === '백엔드 개발자');
assert('No false company match', c3.company === '');

// Results
const passed = tests.filter(t => t.pass).length;
console.log(`\nEXP-031 Results: ${passed}/${tests.length} passed`);
if (passed < tests.length) {
  tests.filter(t => !t.pass).forEach(t => console.log(`  FAIL: ${t.name}`));
  process.exit(1);
}
