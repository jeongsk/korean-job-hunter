const assert = require('assert');
const { parseKoreanQuery } = require('./scripts/nlp-parser.js');

let passed = 0, failed = 0;

function test(name, query, checkFn) {
  const result = parseKoreanQuery(query);
  try {
    checkFn(result);
    passed++;
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
    console.log('   filters:', result.filters);
  }
}

// === Unapplied status patterns ===
test('지원 안 한 공고 → unapplied', '지원 안 한 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have IS NULL filter');
  assert(!r.filters.some(f => f.includes('LIKE') && f.includes('지원')), 'no 지원 keyword leak');
});

test('안 지원한 공고 → unapplied', '안 지원한 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have IS NULL filter');
  assert(!r.filters.some(f => f.includes('applied')), 'should NOT have applied filter');
});

test('지원하지 않은 공고 → unapplied', '지원하지 않은 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have IS NULL filter');
  assert(!r.filters.some(f => f.includes('LIKE') && f.includes('않은')), 'no keyword leak');
});

test('미지원 공고 → unapplied', '미지원 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have IS NULL filter');
  assert(!r.filters.some(f => f.includes('LIKE') && f.includes('미지원')), 'no keyword leak');
});

test('아직 안 지원한 거 → unapplied', '아직 안 지원한 거', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have IS NULL filter');
  assert(!r.filters.some(f => f.includes('LIKE') && f.includes('아직')), 'no 아직 keyword leak');
});

// === Positive status still works ===
test('지원한 공고 → applied', '지원한 공고', r => {
  assert(r.filters.some(f => f.includes("applied")), 'should have applied filter');
  assert(!r.filters.some(f => f.includes('IS NULL')), 'should NOT have IS NULL');
});

test('지원완료 공고 → applied', '지원완료 공고', r => {
  assert(r.filters.some(f => f.includes("applied")), 'should have applied filter');
});

test('관심 공고 → interested', '관심 공고', r => {
  assert(r.filters.some(f => f.includes("interested")), 'should have interested filter');
});

// === Conversational phrase noise prevention ===
test('가장 잘 맞는 공고 → no keyword leak', '가장 잘 맞는 공고', r => {
  assert(!r.filters.some(f => f.includes('LIKE')), 'should have no LIKE filters');
});

test('마감순 정렬 → no 정렬 leak', '마감순 정렬', r => {
  assert(!r.filters.some(f => f.includes('정렬')), 'no 정렬 keyword leak');
});

test('추천해줘 → no filters', '추천해줘', r => {
  assert.strictEqual(r.filters.length, 0, 'should have no filters');
});

// === Compound queries with unapplied ===
test('지원 안 한 서울 공고', '지원 안 한 서울 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have unapplied');
  assert(r.filters.some(f => f.includes('서울')), 'should have location filter');
});

test('미지원 정규직 공고', '미지원 정규직 공고', r => {
  assert(r.filters.some(f => f.includes('IS NULL')), 'should have unapplied');
  assert(r.filters.some(f => f.includes('regular')), 'should have employment filter');
});

console.log(`\n📊 ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
