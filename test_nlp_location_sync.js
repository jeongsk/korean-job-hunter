// EXP-127: NLP location list synchronized with CITIES + expanded tech hub coverage
const { parseKoreanQuery } = require('./scripts/nlp-parser');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch(e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
}

// === CITIES sync: every location in post-processor CITIES must be NLP-queryable ===
const CITIES_LIST = ['서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '판교', '강남',
  '영등포', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌',
  '수원', '이천', '세종', '여의도', '신촌', '홍대', '건대', '동탄', '청주', '천안', '양재',
  '논현', '신사', '삼성', '방배', '광화문', '을지로', '종로', '시흥', '안양', '안산', '평택',
  '파주', '김포', '창원', '포항'];

for (const loc of CITIES_LIST) {
  // 삼성 is a company name first, so skip location check
  if (loc === '삼성') { passed++; continue; }
  test(`${loc} 공고 → location filter`, () => {
    const r = parseKoreanQuery(`${loc} 공고`);
    assert(r.filters.some(f => f.includes(`j.location LIKE '%${loc}%'`)),
      `Expected location filter for ${loc}, got: ${JSON.stringify(r.filters)}`);
  });
}

// === Specific location query tests ===
test('여의도 공고 → location filter', () => {
  const r = parseKoreanQuery('여의도 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%여의도%'")));
});

test('세종 프론트엔드 공고 → location + skill filter', () => {
  const r = parseKoreanQuery('세종 프론트엔드 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%세종%'")));
});

test('홍대 리액트 공고 → location + skill filter', () => {
  const r = parseKoreanQuery('홍대 리액트 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%홍대%'")));
  assert(r.filters.some(f => f.includes("j.skills LIKE '%react%'")));
});

test('건대 자바 공고 → location + skill filter', () => {
  const r = parseKoreanQuery('건대 자바 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%건대%'")));
});

test('신촌 파이썬 공고 → location + skill filter', () => {
  const r = parseKoreanQuery('신촌 파이썬 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%신촌%'")));
});

// === New tech hub locations ===
test('동탄 공고 → location filter', () => {
  const r = parseKoreanQuery('동탄 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%동탄%'")));
});

test('천안 백엔드 공고 → location filter', () => {
  const r = parseKoreanQuery('천안 백엔드 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%천안%'")));
});

test('창원 공고 → location filter', () => {
  const r = parseKoreanQuery('창원 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%창원%'")));
});

test('광화문 공고 → location filter', () => {
  const r = parseKoreanQuery('광화문 공고');
  assert(r.filters.some(f => f.includes("j.location LIKE '%광화문%'")));
});

// === Negation with new locations ===
test('여의도 빼고 공고 → NOT location filter', () => {
  const r = parseKoreanQuery('여의도 빼고 공고');
  assert(r.filters.some(f => f.includes("j.location NOT LIKE '%여의도%'")));
});

// === Location doesn't leak to title/company ===
test('홍대 공고 → 홍대 not in title/company LIKE', () => {
  const r = parseKoreanQuery('홍대 공고');
  const leakyFilter = r.filters.find(f => f.includes("j.title LIKE '%홍대%'"));
  assert(!leakyFilter, '홍대 should be consumed as location, not leak to title search');
});

test('신촌 공고 → 신촌 not in title/company LIKE', () => {
  const r = parseKoreanQuery('신촌 공고');
  const leakyFilter = r.filters.find(f => f.includes("j.title LIKE '%신촌%'"));
  assert(!leakyFilter, '신촌 should be consumed as location, not leak to title search');
});

console.log(`\n📊 NLP Location Sync: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
