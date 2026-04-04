/**
 * EXP-098: Deadline normalization tests
 * Tests normalizeDeadline() for D-N, N일전, MM/DD, YYYY-MM-DD, 상시모집 patterns
 * Also tests that all 3 post-processors wire normalizeDeadline correctly.
 */

const assert = require('assert');
const { normalizeDeadline, parseWantedJob } = require('./scripts/post-process-wanted');
const { parseJobKoreaCard } = require('./scripts/post-process-jobkorea');
const { parseLinkedInCard } = require('./scripts/post-process-linkedin');

let passed = 0, failed = 0;

function check(id, actual, expected, label) {
  // For date comparisons, compare strings
  const ok = actual === expected;
  if (ok) { passed++; }
  else { failed++; console.log(`❌ ${id}: ${label}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); }
}

function checkIncludes(id, actual, substring, label) {
  const ok = actual && actual.includes(substring);
  if (ok) { passed++; }
  else { failed++; console.log(`❌ ${id}: ${label}\n   expected to include: ${substring}\n   actual: ${JSON.stringify(actual)}`); }
}

function checkNull(id, actual, label) {
  const ok = actual === null;
  if (ok) { passed++; }
  else { failed++; console.log(`❌ ${id}: ${label}\n   expected null\n   actual: ${JSON.stringify(actual)}`); }
}

// === Unit tests for normalizeDeadline ===
console.log('--- normalizeDeadline unit tests ---');

// D-N patterns
check('DL-01', normalizeDeadline('D-3'), getDateStr(3), 'D-3 → 3 days from now');
check('DL-02', normalizeDeadline('D-14'), getDateStr(14), 'D-14 → 14 days from now');
check('DL-03', normalizeDeadline('D-0'), getDateStr(0), 'D-0 → today');
check('DL-04', normalizeDeadline('d-7'), getDateStr(7), 'd-7 (lowercase) → 7 days from now');

// N일 전 / N주 전 (estimated 30-day window)
check('DL-05', normalizeDeadline('3일 전'), getDateStr(27), '3일 전 → 27 days remaining (30-3)');
check('DL-06', normalizeDeadline('2주 전'), getDateStr(16), '2주 전 → 16 days remaining (30-14)');
check('DL-07', normalizeDeadline('31일 전'), null, '31일 전 → null (expired)');
check('DL-08', normalizeDeadline('5주 전'), null, '5주 전 → null (35 days ago > 30)');

// YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
check('DL-09', normalizeDeadline('2026-04-15'), '2026-04-15', 'ISO date');
check('DL-10', normalizeDeadline('2026.04.15'), '2026-04-15', 'Dot-separated date');
check('DL-11', normalizeDeadline('2026/04/15'), '2026-04-15', 'Slash-separated date');
check('DL-12', normalizeDeadline('2026-12-31'), '2026-12-31', 'End of year date');

// MM/DD (current/next year)
{
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const dd = String(nextMonth.getDate()).padStart(2, '0');
  check('DL-13', normalizeDeadline(`${mm}/${dd}`), `${nextMonth.getFullYear()}-${mm}-${dd}`, 'MM/DD future date');
}

// 상시모집 / 수시모집
checkNull('DL-14', normalizeDeadline('상시모집'), '상시모집 → null');
checkNull('DL-15', normalizeDeadline('수시모집'), '수시모집 → null');
checkNull('DL-16', normalizeDeadline('상시채용'), '상시채용 → null');

// Unparseable
checkNull('DL-17', normalizeDeadline(''), 'empty → null');
checkNull('DL-18', normalizeDeadline(null), 'null → null');
checkNull('DL-19', normalizeDeadline('채용중'), '채용중 → null (no date info)');

// === Integration: Wanted post-processor ===
console.log('--- Wanted post-processor deadline integration ---');

{
  // Pass raw object with deadline already extracted by DOM parser
  const r1 = parseWantedJob({ id: '1', title: '프론트엔드 개발자', company: '카카오', experience: '경력 3~7년', deadline: 'D-5', link: '' });
  check('DL-W01', r1.deadline, getDateStr(5), 'Wanted D-5 deadline normalized');

  const r2 = parseWantedJob({ id: '2', title: '백엔드 개발자', company: '네이버', experience: '경력 무관', deadline: '~04/30(수) 마감', link: '' });
  checkIncludes('DL-W02', r2.deadline, '-04-30', 'Wanted MM/DD deadline normalized');

  // 상시모집 → normalizeDeadline returns null, so raw text preserved
  const r3 = parseWantedJob({ id: '3', title: '데이터 엔지니어', company: '카카오', experience: '경력 5년 이상', deadline: '상시모집', link: '' });
  checkIncludes('DL-W03', r3.deadline, '상시모집', 'Wanted 상시모집 preserved');
}

// === Integration: JobKorea post-processor ===
console.log('--- JobKorea post-processor deadline integration ---');

{
  const r1 = parseJobKoreaCard('백엔드 개발자\n㈜카카오\n경력 3~7년\nD-3\n서울');
  check('DL-JK01', r1.deadline, getDateStr(3), 'JobKorea D-3 deadline normalized');

  const r2 = parseJobKoreaCard('프론트엔드\n네이버\n신입\n2026.05.15 마감\n판교');
  check('DL-JK02', r2.deadline, '2026-05-15', 'JobKorea YYYY.MM.DD deadline normalized');

  const r3 = parseJobKoreaCard('데이터 분석가\n토스\n경력무관\n상시모집\n서울 강남구');
  checkIncludes('DL-JK03', r3.deadline, '상시모집', 'JobKorea 상시모집 preserved');
}

// === Summary ===
console.log('───────────────────────────────────────────────────');
const total = passed + failed;
console.log(`${failed === 0 ? '✅' : '❌'} test_deadline_normalization.js: ${passed} passed${failed > 0 ? `, ${failed} failed` : ''}`);
if (failed > 0) process.exit(1);

// Helper: get date string N days from now (local timezone)
function getDateStr(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
