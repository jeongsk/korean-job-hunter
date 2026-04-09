/**
 * EXP-180: Culture inference from job metadata
 * 
 * API-scraped jobs have no JD description, so extractCultureKeywords returns [].
 * inferCultureFromMetadata uses title, company name, work_type, and experience
 * to make conservative culture inferences, activating the 15% culture matching weight.
 */

const { inferCultureFromMetadata } = require('./scripts/scrape-wanted-api.js');

let passed = 0, failed = 0;

function assert(label, actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)) {
    passed++;
  } else {
    failed++;
    console.log(`❌ ${label}: expected [${expectedSorted}], got [${actualSorted}]`);
  }
}

function assertIncludes(label, actual, expectedKeyword) {
  if (actual.includes(expectedKeyword)) {
    passed++;
  } else {
    failed++;
    console.log(`❌ ${label}: expected to include "${expectedKeyword}", got [${actual}]`);
  }
}

// === Startup indicators ===
assertIncludes('스타트업 in title → fast_paced', 
  inferCultureFromMetadata('백엔드 개발자 (스타트업)', '테스트'), 'fast_paced');
assertIncludes('스타트업 in title → innovative',
  inferCultureFromMetadata('백엔드 개발자 (스타트업)', '테스트'), 'innovative');
assertIncludes('스타트업 in title → autonomous',
  inferCultureFromMetadata('백엔드 개발자 (스타트업)', '테스트'), 'autonomous');
assertIncludes('Startup in company → fast_paced',
  inferCultureFromMetadata('Developer', 'Acme Startup'), 'fast_paced');
assertIncludes('랩스 in company → fast_paced',
  inferCultureFromMetadata('개발자', '테스트랩스'), 'fast_paced');
assertIncludes('Labs in company → fast_paced',
  inferCultureFromMetadata('Developer', 'AI Labs'), 'fast_paced');

// === Remote work → work_life_balance + autonomous ===
assertIncludes('remote work_type → work_life_balance',
  inferCultureFromMetadata('개발자', '회사', { work_type: 'remote' }), 'work_life_balance');
assertIncludes('remote work_type → autonomous',
  inferCultureFromMetadata('개발자', '회사', { work_type: 'remote' }), 'autonomous');

// === Hybrid → work_life_balance ===
assertIncludes('hybrid work_type → work_life_balance',
  inferCultureFromMetadata('개발자', '회사', { work_type: 'hybrid' }), 'work_life_balance');
// Hybrid should NOT give autonomous
const hybridCulture = inferCultureFromMetadata('개발자', '회사', { work_type: 'hybrid' });
assert('hybrid should NOT give autonomous', hybridCulture, ['work_life_balance']);

// === Large company → structured + collaborative ===
assertIncludes('카카오 → structured',
  inferCultureFromMetadata('개발자', '카카오'), 'structured');
assertIncludes('네이버 → structured',
  inferCultureFromMetadata('개발자', '네이버'), 'structured');
assertIncludes('삼성 → structured',
  inferCultureFromMetadata('개발자', '삼성'), 'structured');
assertIncludes('카카오뱅크 → collaborative',
  inferCultureFromMetadata('개발자', '카카오뱅크'), 'collaborative');
assertIncludes('쿠팡 → structured',
  inferCultureFromMetadata('개발자', '쿠팡'), 'structured');

// === Senior/lead → autonomous ===
assertIncludes('시니어 → autonomous',
  inferCultureFromMetadata('시니어 백엔드 개발자', '회사'), 'autonomous');
assertIncludes('Senior → autonomous',
  inferCultureFromMetadata('Senior Developer', 'Company'), 'autonomous');
assertIncludes('리드 → autonomous',
  inferCultureFromMetadata('개발 리드', '회사'), 'autonomous');
assertIncludes('Lead → autonomous',
  inferCultureFromMetadata('Tech Lead', 'Company'), 'autonomous');

// === Newbie/junior → learning_focused ===
assertIncludes('신입 → learning_focused',
  inferCultureFromMetadata('신입 개발자', '회사'), 'learning_focused');
assertIncludes('주니어 → learning_focused',
  inferCultureFromMetadata('주니어 백엔드', '회사'), 'learning_focused');
assertIncludes('Junior → learning_focused',
  inferCultureFromMetadata('Junior Developer', 'Company'), 'learning_focused');

// === No match → empty ===
assert('generic title → empty',
  inferCultureFromMetadata('백엔드 개발자', '일반회사', { work_type: 'onsite' }), []);

// === Multiple inferences combined ===
const remoteStartup = inferCultureFromMetadata('Senior Developer', 'AI Startup Labs', { work_type: 'remote' });
assertIncludes('remote + startup + senior → fast_paced', remoteStartup, 'fast_paced');
assertIncludes('remote + startup + senior → autonomous', remoteStartup, 'autonomous');
assertIncludes('remote + startup + senior → work_life_balance', remoteStartup, 'work_life_balance');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
