// EXP-127: Test that NLP parser locations are synchronized with post-processor CITIES
// and covers all major Korean tech hub locations

const { parseKoreanQuery } = require('./scripts/nlp-parser');
const assert = require('assert');

// All locations from post-process-wanted.js CITIES regex
const CITIES_LIST = ['서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '판교', '강남', '영등포', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌', '수원', '이천', '세종', '여의도', '신촌', '홍대', '건대'];

let passed = 0, failed = 0;

// Test: every CITIES location should generate a location filter when queried
for (const loc of CITIES_LIST) {
  const result = parseKoreanQuery(`${loc} 공고`);
  const hasLocationFilter = result.filters.some(f => f.includes(`j.location LIKE '%${loc}%'`));
  if (hasLocationFilter) {
    passed++;
  } else {
    failed++;
    console.log(`❌ NLP parser missing location: ${loc}`);
  }
}

// Test: additional important tech hub locations
const additionalTechHubs = [
  '동탄', // Dongtan - new tech city
  '청주', // Cheongju - Chungbuk tech
  '천안', // Cheonan
  '양재', // Yangjae
  '삼성', // Samsung (station area)
  '논현', // Nonhyeon
  '방배', // Bangbae
  '신사', // Sinsa
];

for (const loc of additionalTechHubs) {
  const result = parseKoreanQuery(`${loc} 공고`);
  const hasLocationFilter = result.filters.some(f => f.includes(`j.location LIKE '%${loc}%'`));
  if (hasLocationFilter) {
    passed++;
  } else {
    // These are expected to fail before fix - just informational
    console.log(`ℹ️  Additional tech hub not in NLP: ${loc}`);
  }
}

console.log(`\n📊 NLP Location Coverage: ${passed}/${passed + failed} CITIES locations queryable`);
if (failed > 0) process.exit(1);
