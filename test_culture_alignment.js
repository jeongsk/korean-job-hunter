// EXP-159: Culture alignment — 7 culture categories synced between post-processors and matching
const assert = require('assert');

// Replicate culture keyword sets from run-match-tests.js
const cultureKeywords = {
  'innovative': ['혁신', '도전', '창의', 'creative', 'innovation', '새로운'],
  'collaborative': ['협업', '팀워크', '팀', 'collaborative', 'partnership', '함께', 'agile'],
  'fast-paced': ['agile', '빠른', '실시간', '스타트업'],
  'structured': ['체계', 'process', 'systematic', '프로세스'],
  'learning_focused': ['성장', '학습', 'learning', 'growth', '교육', '워크샵', '컨퍼런스', '스터디', '멘토링', '세미나'],
  'autonomous': ['자율', '독립', 'self-directed', '자유', '오너십', '주도적'],
  'work_life_balance': ['워라밸', '워크라이프밸런스', 'wlb', '유연근무', '시차출근', '자유출퇴근', '연차', '휴가', '리프레시'],
};

// Replicate culture keywords from post-process-wanted.js
const CULTURE_PATTERNS = {
  innovative: /(혁신|도전|창의|creative|innovation|새로운|trailblaz|disrupt)/i,
  collaborative: /(협업|팀워크|팀|collaborative|partnership|함께|agile|소통|communication)/i,
  fast_paced: /(agile|빠른|실시간|스타트업|fast[\s-]?paced|rapid|빠르게)/i,
  structured: /(체계|process|systematic|프로세스|표준화|standard)/i,
  learning_focused: /(성장|학습|learning|growth|교육|워크샵|컨퍼런스|개발자\s*커뮤니티|스터디|멘토|멘토링|mentoring|세미나|사내강의|도서지원|시험비지원)/i,
  autonomous: /(자율|독립|autonomous|independent|자기주도|오너십|ownership|주도적|자유로운|자유도|discretion)/i,
  work_life_balance: /(워라밸|워크라이프밸런스|work[\s_-]?life[\s_-]?balance|wlb|유연근무|flexible\s*(working|hours|time)|시차출근|자유출퇴근|자율출근|연차|휴가|sabbatical|리프레시|refresh|휴식|healing|가족친화|family[\s-]?friendly)/i,
};

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch(e) { failed++; console.error(`❌ ${name}: ${e.message}`); }
}

// Test 1: All 7 culture categories exist in matching algorithm
test('7 culture categories in matching', () => {
  assert.strictEqual(Object.keys(cultureKeywords).length, 7);
  assert.ok(cultureKeywords.learning_focused, 'learning_focused missing');
  assert.ok(cultureKeywords.work_life_balance, 'work_life_balance missing');
});

// Test 2: Matching categories align with post-processor categories
test('matching categories align with post-processor', () => {
  const matchTraits = new Set(Object.keys(cultureKeywords));
  const postTraits = new Set(Object.keys(CULTURE_PATTERNS));
  // fast-paced in matching vs fast_paced in post-processor — same concept
  assert.ok(matchTraits.has('fast-paced'));
  assert.ok(postTraits.has('fast_paced'));
  // All other traits should match exactly
  const normalizedMatch = new Set([...matchTraits].map(t => t.replace('-', '_')));
  const normalizedPost = new Set([...postTraits].map(t => t.replace('_', '-')));
  for (const trait of ['innovative', 'collaborative', 'structured', 'learning_focused', 'autonomous', 'work_life_balance']) {
    assert.ok(matchTraits.has(trait) || normalizedMatch.has(trait), `Missing ${trait} in matching`);
    assert.ok(postTraits.has(trait) || normalizedPost.has(trait), `Missing ${trait} in post-processor`);
  }
});

// Test 3: learning_focused keywords detect from Korean text
test('learning_focused Korean detection', () => {
  const keywords = cultureKeywords.learning_focused;
  const testText = '성장 기회가 많고 교육 지원이 활발합니다';
  assert.ok(keywords.some(kw => testText.includes(kw)), 'Should detect 성장 or 교육');
});

// Test 4: work_life_balance keywords detect from Korean text
test('work_life_balance Korean detection', () => {
  const keywords = cultureKeywords.work_life_balance;
  const testText = '워라밸이 좋고 유연근무제가 있습니다';
  assert.ok(keywords.some(kw => testText.includes(kw)), 'Should detect 워라밸 or 유연근무');
});

// Test 5: structured culture_keywords preferred over text scanning
test('structured culture_keywords takes priority', () => {
  // Simulate: job with culture_keywords=['learning_focused','work_life_balance']
  const jobCultureTraits = new Set(['learning_focused', 'work_life_balance']);
  const fakeText = 'no culture keywords in this text';
  
  let signals = 0;
  for (const [trait, keywords] of Object.entries(cultureKeywords)) {
    const jobHasTrait = jobCultureTraits.size > 0
      ? jobCultureTraits.has(trait)
      : keywords.some(kw => fakeText.includes(kw));
    if (jobHasTrait) signals++;
  }
  assert.strictEqual(signals, 2, 'Should only detect the 2 structured traits');
});

// Test 6: Text scanning fallback when no structured keywords
test('text scanning fallback', () => {
  const jobCultureTraits = new Set([]);
  const testText = '혁신적인 스타트업에서 자율적으로 일하세요';
  
  let signals = 0;
  for (const [trait, keywords] of Object.entries(cultureKeywords)) {
    const jobHasTrait = jobCultureTraits.size > 0
      ? jobCultureTraits.has(trait)
      : keywords.some(kw => testText.includes(kw));
    if (jobHasTrait) signals++;
  }
  assert.ok(signals >= 2, 'Should detect innovative and autonomous from text');
});

// Test 7: Culture score calculation with new categories
test('culture score with learning_focused match', () => {
  const candidateCulture = {
    learning_focused: 0.8,
    work_life_balance: 0.9,
    innovative: 0.7,
  };
  const jobTraits = new Set(['learning_focused', 'innovative', 'collaborative']);
  
  let signals = 0, matches = 0;
  for (const [trait] of Object.entries(cultureKeywords)) {
    const jobHas = jobTraits.has(trait);
    const candidatePrefers = (candidateCulture[trait] || 0) > 0.5;
    if (jobHas) {
      signals++;
      if (candidatePrefers) matches++;
    }
  }
  // 3 signals (learning_focused, innovative, collaborative)
  // 2 matches (learning_focused, innovative) — collaborative not in candidate prefs
  assert.strictEqual(signals, 3);
  assert.strictEqual(matches, 2);
  const score = Math.round((matches / signals) * 80) + 20;
  assert.strictEqual(score, 73); // (2/3)*80+20 = 73
});

// Test 8: Post-processor extracts learning_focused
test('post-processor learning_focused extraction', () => {
  const text = '성장할 수 있는 환경, 멘토링 프로그램, 사내 강의 지원';
  assert.ok(CULTURE_PATTERNS.learning_focused.test(text));
});

// Test 9: Post-processor extracts work_life_balance
test('post-processor work_life_balance extraction', () => {
  const text = '자유로운 출퇴근, 유연근무제, 리프레시 휴가';
  assert.ok(CULTURE_PATTERNS.work_life_balance.test(text));
});

// Test 10: WLB abbreviation detected
test('WLB abbreviation in both', () => {
  assert.ok(cultureKeywords.work_life_balance.includes('wlb'));
  assert.ok(CULTURE_PATTERNS.work_life_balance.test('wlb'));
});

console.log(`\n📊 Culture alignment tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
