#!/usr/bin/env node
/**
 * EXP-041: LinkedIn Parsing Test Suite
 * 
 * LinkedIn scraping currently has NO dedicated parsing tests.
 * This tests the extraction logic for LinkedIn job cards.
 * 
 * Run: node test_linkedin_parsing.js
 */

const assert = require('assert');

// ── LinkedIn card text parsing functions ──

/**
 * Parse a LinkedIn job card object into a normalized job record.
 * LinkedIn cards have: title, company, location, link
 * Missing fields (experience, work_type, deadline, salary) are common.
 */
function parseLinkedInCard(card) {
  const result = {
    source: 'linkedin',
    title: '',
    company: '',
    location: '',
    experience: null,
    work_type: null,
    salary: null,
    deadline: null,
    link: ''
  };

  // Title cleanup
  let title = (card.title || '').trim();
  
  // Company cleanup - LinkedIn sometimes appends location-like suffixes
  let company = (card.company || '').trim();
  
  // Location normalization
  let location = (card.location || '').trim();
  
  // Link normalization - LinkedIn sometimes has tracking redirects
  let link = card.link || '';
  if (link.includes('/jobs/view/')) {
    const match = link.match(/\/jobs\/view\/(\d+)/);
    if (match) {
      link = `https://www.linkedin.com/jobs/view/${match[1]}`;
    }
  }

  // Extract work_type from title or location
  const workTypePatterns = [
    { pattern: /원격\s*근무|remote/i, value: 'remote' },
    { pattern: /하이브리드|hybrid/i, value: 'hybrid' },
  ];
  for (const wt of workTypePatterns) {
    if (wt.pattern.test(title) || wt.pattern.test(location)) {
      result.work_type = wt.value;
      break;
    }
  }

  // Extract experience from title (LinkedIn often has it in title)
  const expMatch = title.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  if (expMatch) {
    result.experience = `${expMatch[1]}-${expMatch[2]}년`;
    title = title.replace(/\s*\d+\s*[~-]\s*\d+\s*년/, '').trim();
  } else {
    const expSingle = title.match(/신입|주니어|시니어|경력\s*(\d+)\s*년?/);
    if (expSingle) {
      if (/신입|주니어/.test(expSingle[0])) {
        result.experience = '0-2년';
      } else if (/시니어/.test(expSingle[0])) {
        result.experience = '7-10년';
      } else {
        result.experience = `${expSingle[1]}년+`;
      }
      title = title.replace(/\s*(신입|주니어|시니어|경력\s*\d+\s*년?)\s*/, ' ').trim();
    }
  }

  // Extract salary from title (some LinkedIn postings include it)
  const salaryMatch = title.match(/(월|연)\s*(\d[,0-9]+)\s*(만원?|원)/);
  if (salaryMatch) {
    result.salary = salaryMatch[0];
    title = title.replace(/\s*(월|연)\s*\d[,0-9]+\s*(만원?|원)\s*/, ' ').trim();
  }

  // Korean location normalization - strip country suffix first, then map cities
  if (location) {
    let loc = location
      .replace(/,\s*South Korea\s*$/i, '')
      .replace(/,?\s*대한민국\s*$/, '');
    
    // City mapping (match city name at start of remaining string)
    const cityMap = [
      [/\bSeoul\b/i, '서울'],
      [/\bBusan\b/i, '부산'],
      [/\bSuwon\b/i, '수원'],
      [/\bPangyo\b/i, '판교'],
      [/\bIncheon\b/i, '인천'],
      [/\bDaegu\b/i, '대구'],
      [/\bDaejeon\b/i, '대전'],
      [/\bGwangju\b/i, '광주'],
      [/\bUlsan\b/i, '울산'],
      [/\bJeju\b/i, '제주'],
    ];
    for (const [re, korean] of cityMap) {
      if (re.test(loc)) {
        loc = loc.replace(re, korean);
        break; // only first match
      }
    }
    location = loc.replace(/,?\s*Gyeonggi-do/i, ' 경기도')
                  .replace(/,?\s*Gyeonggi/i, ' 경기도')
                  .replace(/,\s*/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
  }

  result.title = title;
  result.company = company;
  result.location = location;
  result.link = link;

  return result;
}

// ── Test Cases ──

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n   ${e.message}`);
    failed++;
  }
}

// Basic extraction
test('LN-001: Standard LinkedIn card', () => {
  const card = {
    title: 'Software Engineer',
    company: 'Samsung Electronics',
    location: 'Suwon, Gyeonggi-do, South Korea',
    link: 'https://www.linkedin.com/jobs/view/4012345678'
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.title, 'Software Engineer');
  assert.strictEqual(result.company, 'Samsung Electronics');
  assert.strictEqual(result.location, '수원 경기도');
  assert.strictEqual(result.link, 'https://www.linkedin.com/jobs/view/4012345678');
  assert.strictEqual(result.source, 'linkedin');
});

test('LN-002: Korean company name', () => {
  const card = {
    title: '프론트엔드 개발자',
    company: '카카오',
    location: 'Seoul, South Korea',
    link: 'https://www.linkedin.com/jobs/view/3999888777'
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.title, '프론트엔드 개발자');
  assert.strictEqual(result.company, '카카오');
  assert.strictEqual(result.location, '서울');
});

test('LN-003: Remote work detection', () => {
  const card = {
    title: 'Data Engineer - Remote',
    company: 'Coupang',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.work_type, 'remote');
});

test('LN-004: Hybrid work detection from location', () => {
  const card = {
    title: 'Backend Developer',
    company: 'Naver',
    location: 'Pangyo, South Korea (Hybrid)',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.work_type, 'hybrid');
});

test('LN-005: Experience in title (range)', () => {
  const card = {
    title: 'Product Designer 3~5년',
    company: '토스',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.experience, '3-5년');
  assert.strictEqual(result.title, 'Product Designer');
});

test('LN-006: 신입 experience detection', () => {
  const card = {
    title: '신입 백엔드 개발자',
    company: '라인',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.experience, '0-2년');
  assert.strictEqual(result.title, '백엔드 개발자');
});

test('LN-007: 시니어 experience detection', () => {
  const card = {
    title: '시니어 DevOps 엔지니어',
    company: '배달의민족',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.experience, '7-10년');
});

test('LN-008: Salary extraction from title', () => {
  const card = {
    title: 'ML Engineer 연 8,000만원',
    company: 'SK Telecom',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.ok(result.salary);
  assert.ok(result.salary.includes('8,000'));
  assert.strictEqual(result.title, 'ML Engineer');
});

test('LN-009: Tracking redirect link normalization', () => {
  const card = {
    title: 'iOS Developer',
    company: 'Apple',
    location: 'Seoul, South Korea',
    link: 'https://www.linkedin.com/jobs/view/4055512345?trackingId=abc123&refId=xyz'
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.link, 'https://www.linkedin.com/jobs/view/4055512345');
});

test('LN-010: Empty fields handled gracefully', () => {
  const card = {
    title: '',
    company: '',
    location: '',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.title, '');
  assert.strictEqual(result.company, '');
  assert.strictEqual(result.source, 'linkedin');
  assert.strictEqual(result.experience, null);
  assert.strictEqual(result.work_type, null);
});

test('LN-011: 경력 N년 experience detection', () => {
  const card = {
    title: '경력 5년 Android Developer',
    company: 'Samsung',
    location: 'Suwon, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.experience, '5년+');
});

test('LN-012: Busan location normalization', () => {
  const card = {
    title: 'QA Engineer',
    company: 'Lotte',
    location: 'Busan, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.ok(result.location.startsWith('부산'));
});

test('LN-013: No work type for on-site', () => {
  const card = {
    title: 'Security Engineer',
    company: 'KB Bank',
    location: 'Seoul, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.work_type, null);
});

test('LN-014: Multiple location formats', () => {
  const card = {
    title: 'DevOps',
    company: 'AWS',
    location: 'Pangyo, South Korea',
    link: ''
  };
  const result = parseLinkedInCard(card);
  assert.ok(result.location.includes('판교'));
});

test('LN-015: Korean title with special chars', () => {
  const card = {
    title: '[사이버보안] 침해대응 전문가',
    company: 'KISA',
    location: 'Seoul, South Korea',
    link: 'https://www.linkedin.com/jobs/view/9999999999'
  };
  const result = parseLinkedInCard(card);
  assert.strictEqual(result.title, '[사이버보안] 침해대응 전문가');
  assert.strictEqual(result.link, 'https://www.linkedin.com/jobs/view/9999999999');
});

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`LinkedIn Parsing Tests: ${passed}/${passed + failed} passed`);
if (failed > 0) {
  console.log(`❌ ${failed} FAILURES`);
  process.exit(1);
} else {
  console.log('✅ ALL PASS');
}
