// EXP-045: Cross-source deduplication test
// Tests fuzzy matching of same job posted on multiple sources (Wanted, JobKorea, LinkedIn)
// Dedup key: normalized(title) + normalized(company)

const assert = require('assert');

// ── Normalization helpers ──

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')             // remove parentheticals, keep space as boundary
    .replace(/[\-_\/\\·]+/g, ' ')         // convert separators to space (word boundaries)
    .replace(/[^\w가-힣\s]/g, '')         // keep alphanumeric + korean + spaces
    .replace(/\s+/g, ' ')
    .replace(/^(주|㈜|주식회사|유한회사)\s*/, '') // strip company prefixes
    .trim();
}

function companyNormalize(text) {
  return normalize(text)
    .replace(/korea\s*$/i, '')
    .replace(/코리아\s*$/, '')
    .replace(/주식회사\s*$/, '')
    .replace(/\s+/g, '')
    .trim();
}

// ── Similarity scoring ──

function titleSimilarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;

  // Exact match after normalization (ignoring spaces)
  const nac = na.replace(/\s/g, '');
  const nbc = nb.replace(/\s/g, '');
  if (nac === nbc) return 1.0;

  // Check if one contains the other (no spaces)
  if (nac.includes(nbc) || nbc.includes(nac)) return 0.9;

  // Korean↔English title equivalents
  const koEnMap = {
    '프론트엔드': 'frontend', '백엔드': 'backend', '풀스택': 'fullstack',
    '개발자': 'developer', '엔지니어': 'engineer', '데이터': 'data',
    '분석가': 'analyst', '디자이너': 'designer', '매니저': 'manager',
    '데브옵스': 'devops', '모바일': 'mobile', '인프라': 'infrastructure',
  };
  // Build reverse map too
  const enKoMap = {};
  for (const [k, v] of Object.entries(koEnMap)) enKoMap[v] = k;

  // Token-based Jaccard with Korean↔English normalization
  const tokenize = s => {
    const tokens = new Set();
    const kr = s.match(/[가-힣]{2,}/g) || [];
    kr.forEach(t => {
      tokens.add(t);
      // Add English equivalent if exists
      const en = koEnMap[t];
      if (en) tokens.add(en);
    });
    const en = s.match(/[a-z]{2,}/g) || [];
    en.forEach(t => {
      tokens.add(t);
      // Add Korean equivalent if exists
      const ko = enKoMap[t];
      if (ko) tokens.add(ko);
    });
    return tokens;
  };
  const ta = tokenize(na);
  const tb = tokenize(nb);
  if (ta.size === 0 && tb.size === 0) return 0;

  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = new Set([...ta, ...tb]).size;
  return intersection / union;
}

function companyMatch(a, b) {
  const na = companyNormalize(a);
  const nb = companyNormalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // One contains the other (e.g., "삼성" vs "삼성sds")
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

// ── Dedup check ──

function isDuplicate(jobA, jobB) {
  // Different companies → not duplicate
  if (!companyMatch(jobA.company, jobB.company)) return false;

  // Same company → check title similarity
  const sim = titleSimilarity(jobA.title, jobB.title);
  return sim >= 0.6;
}

function findDuplicates(jobs) {
  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < jobs.length; i++) {
    if (assigned.has(i)) continue;
    const group = [i];
    assigned.add(i);

    for (let j = i + 1; j < jobs.length; j++) {
      if (assigned.has(j)) continue;
      if (isDuplicate(jobs[i], jobs[j])) {
        group.push(j);
        assigned.add(j);
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

// ── Test cases ──

const testCases = [
  // Exact same posting across sources
  {
    name: "exact-same-title-same-company",
    jobs: [
      { title: "프론트엔드 개발자", company: "카카오", source: "wanted", url: "https://wanted.co.kr/wd/123" },
      { title: "프론트엔드 개발자", company: "카카오", source: "jobkorea", url: "https://jobkorea.co.kr/Recruit/456" },
    ],
    expectedDuplicates: 1, // one group
  },
  // Slight title variation (senior prefix)
  {
    name: "senior-prefix-variation",
    jobs: [
      { title: "프론트엔드 개발자", company: "카카오", source: "wanted", url: "w1" },
      { title: "시니어 프론트엔드 개발자", company: "(주)카카오", source: "jobkorea", url: "j1" },
    ],
    expectedDuplicates: 1,
  },
  // Company prefix difference
  {
    name: "company-prefix-normalization",
    jobs: [
      { title: "백엔드 개발자", company: "네이버", source: "wanted", url: "w2" },
      { title: "백엔드 개발자", company: "㈜네이버", source: "jobkorea", url: "j2" },
    ],
    expectedDuplicates: 1,
  },
  // Different jobs at same company (should NOT match)
  {
    name: "different-jobs-same-company",
    jobs: [
      { title: "프론트엔드 개발자", company: "카카오", source: "wanted", url: "w3" },
      { title: "백엔드 개발자", company: "카카오", source: "jobkorea", url: "j3" },
    ],
    expectedDuplicates: 0,
  },
  // Same title different company (should NOT match)
  {
    name: "same-title-different-company",
    jobs: [
      { title: "프론트엔드 개발자", company: "카카오", source: "wanted", url: "w4" },
      { title: "프론트엔드 개발자", company: "네이버", source: "jobkorea", url: "j4" },
    ],
    expectedDuplicates: 0,
  },
  // English/Korean mixed title
  {
    name: "mixed-language-title",
    jobs: [
      { title: "React Frontend Developer", company: "토스", source: "wanted", url: "w5" },
      { title: "프론트엔드 개발자 (React)", company: "토스", source: "jobkorea", url: "j5" },
    ],
    expectedDuplicates: 1,
  },
  // Company with Korea suffix
  {
    name: "company-korea-suffix",
    jobs: [
      { title: "Software Engineer", company: "Google", source: "linkedin", url: "l1" },
      { title: "Software Engineer", company: "Google Korea", source: "jobkorea", url: "j6" },
    ],
    expectedDuplicates: 1,
  },
  // Three sources, same job
  {
    name: "three-sources-same-job",
    jobs: [
      { title: "데이터 엔지니어", company: "라인", source: "wanted", url: "w6" },
      { title: "데이터 엔지니어", company: "라인", source: "jobkorea", url: "j7" },
      { title: "Data Engineer", company: "LINE", source: "linkedin", url: "l2" },
    ],
    expectedDuplicates: 1, // one group of 3
  },
  // Partial overlap: Java/Spring vs Backend (should NOT match)
  {
    name: "partial-title-no-match",
    jobs: [
      { title: "Java/Spring 백엔드 개발자", company: "배달의민족", source: "wanted", url: "w7" },
      { title: "DevOps 엔지니어", company: "배달의민족", source: "jobkorea", url: "j8" },
    ],
    expectedDuplicates: 0,
  },
  // Subset title with same company
  {
    name: "subset-title-match",
    jobs: [
      { title: "iOS 개발자", company: "당근마켓", source: "wanted", url: "w8" },
      { title: "시니어 iOS 개발자", company: "당근마켓", source: "jobkorea", url: "j9" },
    ],
    expectedDuplicates: 1,
  },
  // Completely different (no match)
  {
    name: "completely-different",
    jobs: [
      { title: "프론트엔드 개발자", company: "카카오", source: "wanted", url: "w9" },
      { title: "데이터 분석가", company: "네이버", source: "linkedin", url: "l3" },
      { title: "iOS 개발자", company: "라인", source: "jobkorea", url: "j10" },
    ],
    expectedDuplicates: 0,
  },
  // Mixed batch: 2 duplicates + 1 unique
  {
    name: "mixed-batch",
    jobs: [
      { title: "백엔드 개발자", company: "삼성", source: "wanted", url: "w10" },
      { title: "백엔드 개발자", company: "삼성", source: "jobkorea", url: "j11" },
      { title: "디자이너", company: "카카오", source: "linkedin", url: "l4" },
    ],
    expectedDuplicates: 1, // one dup group (삼성 backend)
  },
  // English company names case insensitive
  {
    name: "english-company-case-insensitive",
    jobs: [
      { title: "Frontend Developer", company: "Vingle", source: "wanted", url: "w11" },
      { title: "Frontend Developer", company: "vingle", source: "linkedin", url: "l5" },
    ],
    expectedDuplicates: 1,
  },
];

// ── Run tests ──

let passed = 0, failed = 0;
for (const tc of testCases) {
  const groups = findDuplicates(tc.jobs);
  const ok = groups.length === tc.expectedDuplicates;

  // Verify group sizes when duplicates expected
  let detailOk = true;
  if (tc.expectedDuplicates > 0) {
    for (const g of groups) {
      if (g.length < 2) detailOk = false;
    }
  }

  const allOk = ok && detailOk;
  console.log(`${allOk ? '✅' : '❌'} ${tc.name}: found ${groups.length} dup groups (expected ${tc.expectedDuplicates})`);
  if (!allOk) {
    console.log(`   Jobs: ${tc.jobs.map(j => `[${j.source}] ${j.title} @ ${j.company}`).join(' | ')}`);
    if (groups.length > 0) console.log(`   Groups: ${JSON.stringify(groups)}`);
    // Show similarity details
    for (let i = 0; i < tc.jobs.length; i++) {
      for (let j = i + 1; j < tc.jobs.length; j++) {
        const sim = titleSimilarity(tc.jobs[i].title, tc.jobs[j].title);
        const cMatch = companyMatch(tc.jobs[i].company, tc.jobs[j].company);
        console.log(`   ${i}↔${j}: title_sim=${sim.toFixed(2)} company_match=${cMatch} dup=${isDuplicate(tc.jobs[i], tc.jobs[j])}`);
      }
    }
  }
  allOk ? passed++ : failed++;
}

console.log(`\n📊 Cross-Source Dedup: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
