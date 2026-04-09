/**
 * EXP-175: Test Korean number-word salary ranges (천) and stopWord leaks
 */
const { parseKoreanQuery } = require('./scripts/nlp-parser.js');

let pass = 0, fail = 0;
function assert(condition, msg) {
  if (condition) { pass++; }
  else { fail++; console.error(`❌ ${msg}`); }
}

function hasFilter(r, substr) {
  return r.filters.some(f => f.includes(substr));
}
function noLeak(r, word) {
  return !r.filters.some(f => f.includes(`LIKE '%${word}%'`));
}

// 1. 연봉 4천에서 6천 — range with 천+에서
let r = parseKoreanQuery('연봉 4천에서 6천');
assert(hasFilter(r, 'salary_min <= 6000') && hasFilter(r, 'salary_max >= 4000'), 'cheon range: salary range 4000-6000');
assert(noLeak(r, '천에서'), 'cheon range: no 천에서 leak');

// 2. 연봉 5천 이상 — single 천 threshold
r = parseKoreanQuery('연봉 5천 이상');
assert(hasFilter(r, 'salary_min >= 5000'), 'cheon single: salary_min >= 5000');
assert(noLeak(r, '천'), 'cheon single: no 천 leak');

// 3. 연봉 3천~5천만원 — cheon range with 만원 suffix
r = parseKoreanQuery('연봉 3천~5천만원');
assert(hasFilter(r, 'salary_min <= 5000') && hasFilter(r, 'salary_max >= 3000'), 'cheon만원 range: 3000-5000');

// 4. 근처 stopWord
r = parseKoreanQuery('판교 근처 C++ 시니어');
assert(noLeak(r, '근처'), '근처: no leak');

// 5. 신입가능 stopWord
r = parseKoreanQuery('신입가능 Node.js 서울 강남');
assert(noLeak(r, '신입가능'), '신입가능: no leak');

// 6. 연차 stopWord
r = parseKoreanQuery('연차 5년 이상 풀스택 원격');
assert(noLeak(r, '연차'), '연차: no leak');

// 7. Baseline: 연봉 5000~8000 still works
r = parseKoreanQuery('연봉 5000~8000');
assert(hasFilter(r, 'salary_min <= 8000') && hasFilter(r, 'salary_max >= 5000'), 'digit range baseline');

// 8. Baseline: 연봉 1~2억 still works
r = parseKoreanQuery('연봉 1~2억');
assert(hasFilter(r, 'salary_min <= 20000') && hasFilter(r, 'salary_max >= 10000'), '억 range baseline');

// 9. 월급 with 천
r = parseKoreanQuery('월급 3천 이상');
assert(hasFilter(r, 'salary_min >= 36000'), 'monthly 천: 3000*12=36000');

// 10. 연봉 6천 (bare, no suffix)
r = parseKoreanQuery('연봉 6천');
assert(hasFilter(r, 'salary_min >= 6000'), 'cheon bare: salary_min >= 6000');

console.log(`\n${pass}/${pass+fail} tests passed`);
process.exit(fail > 0 ? 1 : 0);
