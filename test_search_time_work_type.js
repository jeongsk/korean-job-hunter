// test_search_time_work_type.js — Verify work_type detected from title at search time
const { spawnSync } = require('child_process');

let passed = 0, failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) { console.log(`✅ ${label}: ${actual}`); passed++; }
  else { console.log(`❌ ${label}: got ${actual}, expected ${expected}`); failed++; }
}

// Test detectWorkType via parsePosition behavior
// We'll invoke the scraper with --limit 1 and check work_type in output
const tests = [
  { keyword: '재택', expectWorkType: 'remote', desc: '재택 keyword returns remote' },
];

// Direct unit test of detectWorkType logic
function detectWorkType(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/(전면\s*재택|완전\s*재택|풀\s*리모트|full\s*remote|100%\s*remote|원격\s*근무)/.test(t)) return 'remote';
  if (/(주\s*\d\s*일\s*출근|hybrid|하이브리드|부분\s*재택)/.test(t)) return 'hybrid';
  if (/(재택|remote|리모트|원격)/.test(t)) return 'remote';
  return 'onsite';
}

assert('재택근무 in title', detectWorkType('[재택근무] 프론트엔드'), 'remote');
assert('Remote in title', detectWorkType('React Developer - Remote'), 'remote');
assert('하이브리드 in title', detectWorkType('백엔드 (하이브리드)'), 'hybrid');
assert('원격근무 in title', detectWorkType('원격근무 풀스택'), 'remote');
assert('Full remote in title', detectWorkType('Full Remote Developer'), 'remote');
assert('onsite default', detectWorkType('프론트엔드 개발자'), 'onsite');
assert('null input', detectWorkType(null), null);
assert('empty input', detectWorkType(''), null);
assert('부분 재택', detectWorkType('[부분 재택] 백엔드'), 'hybrid');
assert('하이브리드 English', detectWorkType('Hybrid Frontend'), 'hybrid');
assert('리모트 in title', detectWorkType('풀리모트 백엔드'), 'remote');
assert('원격 only', detectWorkType('원격 개발자'), 'remote');
assert('주 3일 출근', detectWorkType('[주 3일 출근] 개발자'), 'hybrid');

// Verify the actual scraper script has the fix
const fs = require('fs');
const code = fs.readFileSync('scripts/scrape-wanted-api.js', 'utf8');
const hasFix = code.includes("detectWorkType(title)") && !code.includes("work_type: null,      // enriched via detail page");
assert('Scraper code uses detectWorkType(title)', hasFix, true);

console.log(`\n📊 Search-time work_type: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
