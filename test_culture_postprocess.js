// EXP-063: Culture keyword extraction in post-processor
// Tests that parseWantedJob now extracts culture_keywords from raw card text
// and that the function is also exported for detail-page text processing.
const { parseWantedJob, extractCultureKeywords } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;
const failures = [];

function check(id, got, expected, desc) {
  const ok = typeof expected === 'function' ? expected(got) : JSON.stringify(got) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`✅ ${id}: ${desc}`); }
  else { failed++; failures.push(id); console.log(`❌ ${id}: ${desc} — got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
}

// === parseWantedJob culture extraction from card text ===
const r1 = parseWantedJob('스타트업 서버 개발자케이투스코리아경력 5-11년합격보상금 20만원');
check('CULT-PP-01', r1.culture_keywords, v => Array.isArray(v), 'culture_keywords is array');
check('CULT-PP-02', r1.culture_keywords, v => v.includes('fast_paced'), '스타트업 → fast_paced');

const r2 = parseWantedJob('혁신적인 AI 플랫폼 개발자네이버경력 3년 이상합격보상금 50만원');
check('CULT-PP-03', r2.culture_keywords, v => v.includes('innovative'), '혁신적인 → innovative');

const r3 = parseWantedJob('프론트엔드 개발자카카오경력 2-5년합격보상금 30만원');
check('CULT-PP-04', r3.culture_keywords, [], 'no culture signals → empty array');

const r4 = parseWantedJob('성장 중인 팀과 함께하는 백엔드 개발자 토스경력 3-7년합격보상금 100만원');
check('CULT-PP-05', r4.culture_keywords, v => v.includes('learning_focused'), '성장 → learning_focused');

// Multi-keyword card text
const r5 = parseWantedJob('agile 환경에서 자율적으로 일하는 개발자 카카오뱅크경력 5년 이상합격보상금 70만원');
check('CULT-PP-06', r5.culture_keywords, v => v.includes('fast_paced') && v.includes('autonomous'), 'agile+자율 → fast_paced+autonomous');

// WLB in card text
const r6 = parseWantedJob('워라밸 좋은 회사 백엔드 개발자 직방경력 2년 이상합격보상금 20만원');
check('CULT-PP-07', r6.culture_keywords, v => v.includes('work_life_balance'), '워라밸 → work_life_balance');

// === extractCultureKeywords standalone function ===
check('CULT-PP-08', extractCultureKeywords(null), [], 'null input → empty');
check('CULT-PP-09', extractCultureKeywords(''), [], 'empty input → empty');
check('CULT-PP-10', extractCultureKeywords('협업과 소통을 중시합니다'), ['collaborative'], '협업+소통 → collaborative');

// Detail page text (richer content)
const detail = `우리 팀은 혁신적인 서비스를 만들어갑니다. 
자율적으로 일하며, 팀워크를 중시합니다. 
성장 기회가 많고, 워크라이프밸런스를 지킵니다.
체계적인 프로세스와 코드리뷰로 품질을 관리합니다.`;
const dk = extractCultureKeywords(detail);
check('CULT-PP-11', dk, v => v.includes('innovative') && v.includes('collaborative') && v.includes('autonomous') && v.includes('learning_focused') && v.includes('work_life_balance') && v.includes('structured'), 'detail page extracts 6 culture keywords');

// === Empty input returns culture_keywords: [] ===
const rEmpty = parseWantedJob('');
check('CULT-PP-12', rEmpty.culture_keywords, [], 'empty input → culture_keywords empty');

// === All existing fields still work ===
const rFull = parseWantedJob('스타트업 프론트엔드 개발자카카오경력 3-5년합격보상금 50만원');
check('CULT-PP-13', rFull.company, '카카오', 'company still extracted');
check('CULT-PP-14', rFull.experience, '경력 3-5년', 'experience still extracted');
check('CULT-PP-15', rFull.reward, '보상금 50만원', 'reward still extracted');
check('CULT-PP-16', rFull.title, v => /프론트엔드|스타트업/.test(v), 'title still extracted');

console.log(`\n📊 Culture Post-Process: ${passed}/${passed + failed} passed, ${failed} failed`);
if (failures.length) console.log(`Failed: ${failures.join(', ')}`);
process.exit(failed > 0 ? 1 : 0);
