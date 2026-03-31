// Test suite for JobKorea text parsing
// JobKorea cards have line-separated fields (unlike Wanted's concatenated text)
// Tests the extraction logic from SKILL.md Source 2

const testCases = [
  // Standard: multi-line card text
  {
    name: "standard-multiline",
    raw: "프론트엔드 개발자\n㈜카카오\n경력 3~10년\n서울 영등포구\n마감일 2026.04.15\n스크랩 12",
    expect: { title: "프론트엔드 개발자", company: "카카오", experience: "경력 3~10년", location: "서울 영등포구" }
  },
  // Salary: 연봉 range
  {
    name: "salary-annual-range",
    raw: "백엔드 개발자\n㈜카카오\n경력 3~10년\n연봉 5000~8000만원\n서울 영등포구\n마감일 2026.04.15",
    expect: { title: "백엔드 개발자", company: "카카오", experience: "경력 3~10년", salary: "연봉 5000~8000만원", location: "서울 영등포구" }
  },
  // Salary: 월급 range
  {
    name: "salary-monthly-range",
    raw: "프론트엔드 개발자\n주식회사토스\n경력 5년 이상\n월급 300~500만원\n서울 강남구\n마감일 상시",
    expect: { title: "프론트엔드 개발자", company: "토스", experience: "경력 5년 이상", salary: "월급 300~500만원", location: "서울 강남구" }
  },
  // Salary: single value
  {
    name: "salary-single-value",
    raw: "데이터 엔지니어\n(주)네이버\n경력 3년 이상\n연봉 6000만원 이상\n경기 성남시 분당구",
    expect: { title: "데이터 엔지니어", company: "네이버", experience: "경력 3년 이상", salary: "연봉 6000만원 이상", location: "경기 성남시 분당구" }
  },
  // Salary: 면접후결정 (no salary)
  {
    name: "salary-negotiable",
    raw: "iOS 개발자\n토스뱅크\n경력 3년 이상\n면접후결정\n서울 송파구\n마감일 2026.04.12",
    expect: { title: "iOS 개발자", company: "토스뱅크", experience: "경력 3년 이상", salary: "면접후결정", location: "서울 송파구" }
  },
  // Company with (주) prefix
  {
    name: "company-with-prefix",
    raw: "백엔드 개발자\n(주)네이버\n경력 5년 이상\n경기 성남시 분당구\n마감일 2026.04.10\n스크랩 5",
    expect: { title: "백엔드 개발자", company: "네이버", experience: "경력 5년 이상", location: "경기 성남시 분당구" }
  },
  // Company with 주식회사 prefix
  {
    name: "company-with-corp",
    raw: "데이터 엔지니어\n주식회사토스\n경력무관\n서울 강남구\n마감일 2026.04.20",
    expect: { title: "데이터 엔지니어", company: "토스", experience: "경력무관", location: "서울 강남구" }
  },
  // Short company name (no prefix) — should still be detected
  {
    name: "short-company-no-prefix",
    raw: "iOS 개발자\n토스뱅크\n경력 3년 이상\n서울 송파구\n마감일 2026.04.12\n스크랩 8",
    expect: { title: "iOS 개발자", company: "토스뱅크", experience: "경력 3년 이상", location: "서울 송파구" }
  },
  // Title with tech keywords
  {
    name: "title-with-tech",
    raw: "Java/Spring 백엔드 개발자\n(주)배달의민족\n경력 2~7년\n서울 송파구\n마감일 상시",
    expect: { title: "Java/Spring 백엔드 개발자", company: "배달의민족", experience: "경력 2~7년", location: "서울 송파구" }
  },
  // Minimal fields (no deadline, no scrap count)
  {
    name: "minimal-fields",
    raw: "DevOps 엔지니어\n(주)당근마켓\n경력 5년 이상\n서울 마포구",
    expect: { title: "DevOps 엔지니어", company: "당근마켓", experience: "경력 5년 이상", location: "서울 마포구" }
  },
  // 신입 (entry level)
  {
    name: "entry-level",
    raw: "프론트엔드 개발자 (신입)\n㈜라인\n신입\n서울 영등포구\n마감일 2026.04.30\n지원 45명",
    expect: { title: "프론트엔드 개발자 (신입)", company: "라인", experience: "신입", location: "서울 영등포구" }
  },
  // Company is English name
  {
    name: "english-company",
    raw: "Full-Stack Developer\nGoogle Korea\n경력 5년 이상\n서울 강남구\n마감일 2026.04.25",
    expect: { title: "Full-Stack Developer", company: "Google Korea", experience: "경력 5년 이상", location: "서울 강남구" }
  },
  // Edge: title contains "경력" — should not be misidentified as experience line
  {
    name: "title-with-career-keyword",
    raw: "경력 IT 컨설턴트\n(주)삼성SDS\n경력 10년 이상\n서울 중구\n마감일 2026.04.18",
    expect: { title: "경력 IT 컨설턴트", company: "삼성SDS", experience: "경력 10년 이상", location: "서울 중구" }
  },
  // Edge: company name contains city — two city-matching unknowns
  // First city-match is company (or meaningless), second is actual location
  {
    name: "company-name-not-location",
    raw: "플랫폼 개발자\n서울시\n경력 3년 이상\n경기 성남시 판교\n마감일 2026.04.22",
    expect: { title: "플랫폼 개발자", experience: "경력 3년 이상", location: "경기 성남시 판교" },
    note: "서울시 is ambiguous — could be company or location; second city-match (경기 성남시 판교) is definitely location"
  },
  // Experience with dash range
  {
    name: "experience-dash-range",
    raw: "AI/ML 엔지니어\n(주)카카오엔터프라이즈\n경력 3-8년\n서울 판교\n마감일 2026.04.14",
    expect: { title: "AI/ML 엔지니어", company: "카카오엔터프라이즈", experience: "경력 3-8년", location: "서울 판교" }
  },
];

// Replicate the JobKorea parsing logic from SKILL.md
function parseJobKoreaCard(rawText) {
  const lines = rawText.split(/\n/).map(s => s.trim()).filter(Boolean);
  
  let title = '';
  let company = '';
  let experience = '';
  let location = '';
  let deadline = '';
  let salary = '';
  
  // Location cities regex
  const cityPattern = /(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천|성남|중구)/;
  
  // Company prefix pattern
  const companyPrefix = /^(㈜|\(주\)|주식회사)/;
  
  // UI noise lines to skip
  const uiNoise = /스크랩\d*|지원\d*명|등록/;
  
  // Classify each line
  const classified = lines.map((line, idx) => {
    if (/마감/.test(line)) return { type: 'deadline', line, idx };
    if (/^신입$/.test(line)) return { type: 'experience', line, idx };
    if (/^경력/.test(line)) {
      const rest = line.replace(/^경력\s*/, '');
      if (!rest || /^무관/.test(rest) || /^\d/.test(rest)) return { type: 'experience', line, idx };
    }
    // Salary patterns: 연봉/월급 with 만원, or 면접후결정
    if (/^(연봉|월급)\s*\d/.test(line) || /^면접후결정/.test(line)) return { type: 'salary', line, idx };
    if (uiNoise.test(line)) return { type: 'noise', line, idx };
    return { type: 'unknown', line, idx };
  });
  
  // Extract classified fields
  const dlEntry = classified.find(c => c.type === 'deadline');
  if (dlEntry) deadline = dlEntry.line;
  
  const expEntry = classified.find(c => c.type === 'experience');
  if (expEntry) experience = expEntry.line;
  
  const salEntry = classified.find(c => c.type === 'salary');
  if (salEntry) salary = salEntry.line;
  
  // Remaining unknown lines (in order) — these are title, company, location candidates
  const unknowns = classified.filter(c => c.type === 'unknown');
  
  // Strategy: positional with prefix awareness
  // JobKorea structure: [title, company, location, ...] but some fields may be missing
  
  // First pass: find company by prefix
  let companyIdx = -1;
  for (const u of unknowns) {
    if (companyPrefix.test(u.line)) {
      company = u.line.replace(companyPrefix, '').trim();
      companyIdx = u.idx;
      break;
    }
  }
  
  // Find location: among city-matching unknowns, use the LAST one (handles company-name-is-city edge)
  const cityMatches = unknowns.filter(u => u.idx !== companyIdx && cityPattern.test(u.line));
  if (cityMatches.length > 0) {
    // Use the last city match as location
    const locEntry = cityMatches[cityMatches.length - 1];
    location = locEntry.line;
    locationIdx = locEntry.idx;
    // If there are multiple city matches and no company yet, first city match could be company
    if (!company && cityMatches.length >= 2) {
      company = cityMatches[0].line;
      companyIdx = cityMatches[0].idx;
    }
  }
  
  // Find company (if not found by prefix): first unknown after title that's not location
  if (!company) {
    for (const u of unknowns) {
      if (u.idx !== locationIdx) {
        // This could be title or company — use position: first unknown = title, second = company
        // Unless the first unknown matches city (then it might be company name containing city)
        if (!title) {
          title = u.line;
        } else {
          company = u.line;
          companyIdx = u.idx;
          break;
        }
      }
    }
  }
  
  // Find title: first unknown that's not company or location
  if (!title) {
    for (const u of unknowns) {
      if (u.idx !== companyIdx && u.idx !== locationIdx) {
        title = u.line;
        break;
      }
    }
  }
  
  return { title, company, experience, location, deadline, salary };
}

// Strip prefix helper for company comparison
function stripPrefix(name) {
  return name.replace(/^(㈜|\(주\)|주식회사)\s*/, '').trim();
}

// Run tests
let passed = 0;
let failed = 0;
const failures = [];

for (const tc of testCases) {
  const result = parseJobKoreaCard(tc.raw);
  let ok = true;
  const issues = [];
  
  for (const [field, expected] of Object.entries(tc.expect)) {
    const actual = field === 'company' ? stripPrefix(result[field]) : result[field];
    if (expected && !actual.includes(expected) && !actual.match(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))) {
      issues.push(`${field}: expected "${expected}", got "${actual}"`);
      ok = false;
    }
  }
  
  if (ok) {
    passed++;
    console.log(`✅ ${tc.name}`);
  } else {
    failed++;
    failures.push(tc.name);
    console.log(`❌ ${tc.name}: ${issues.join(', ')}`);
  }
}

console.log(`\n${passed}/${passed + failed} JobKorea parsing tests passed`);
if (failures.length > 0) {
  console.log(`Failed: ${failures.join(', ')}`);
  process.exit(1);
}
