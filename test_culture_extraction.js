// EXP-043: Culture Keyword Extraction from Job Listings
// Tests extraction of cultural preference keywords from Korean job listing text
// These feed into the matching algorithm's culture component (15% weight)

// Culture keyword map (matching SKILL.md categories)
const CULTURE_PATTERNS = {
  innovative: [
    /(혁신|도전|창의|크리에이티브|creative|innovation|challenge|새로운)/i,
  ],
  collaborative: [
    /(협업|팀워크|소통|협력|collaborat|teamwork|communication|partnership|함께|공동)/i,
  ],
  fast_paced: [
    /(빠른|agile|실시간|스타트업|fast[\s-]?paced|rapid|빠르게|민첩)/i,
  ],
  structured: [
    /(체계|프로세스|systematic|process|체계적|조직적|표준화|qa|품질관리)/i,
  ],
  learning_focused: [
    /(성장|학습|learning|growth|교육|워크샵|컨퍼런스|개발자\s*커뮤니티|스터디|멘토)/i,
  ],
  autonomous: [
    /(자율|독립|autonomous|independent|자기주도|오너십|ownership|주도적)/i,
  ],
};

function extractCultureKeywords(text) {
  if (!text) return [];
  const keywords = new Set();
  for (const [keyword, patterns] of Object.entries(CULTURE_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(text)) {
        keywords.add(keyword);
        break; // one match per keyword is enough
      }
    }
  }
  return [...keywords];
}

// === Test Cases ===
const tests = [
  // Realistic Korean job listing snippets
  {
    text: "혁신적인 서비스를 만드는 팀에서 함께 성장할 개발자를 찾습니다. 자율적으로 일하는 문화를 가진 곳입니다.",
    expected: ["autonomous", "collaborative", "innovative", "learning_focused"],
    id: "KR-001"
  },
  {
    text: " agile 환경에서 팀워크를 중시하며 빠르게 서비스를 개선해나갑니다. 체계적인 프로세스로 코드 품질을 관리합니다.",
    expected: ["fast_paced", "collaborative", "structured"],
    id: "KR-002"
  },
  {
    text: "We value innovation and creativity. Our team collaborates closely with rapid iteration cycles.",
    expected: ["collaborative", "fast_paced", "innovative"],
    id: "EN-001"
  },
  {
    text: "프론트엔드 개발자 (경력 3년 이상) 카카오",
    expected: [],
    id: "NO-CULTURE"
  },
  {
    text: "스타트업 정신으로 도전하고, 팀원들과 협업하며 성장하는 환경입니다.",
    expected: ["collaborative", "fast_paced", "innovative", "learning_focused"],
    id: "KR-003"
  },
  {
    text: "자기주도적으로 업무를 진행하며, 오너십을 가지고 프로젝트를 리드합니다. 정기적인 교육과 스터디를 지원합니다.",
    expected: ["autonomous", "learning_focused"],
    id: "KR-004"
  },
  {
    text: "품질관리와 QA 프로세스를 체계적으로 운영합니다. 소통을 중요시합니다.",
    expected: ["structured", "collaborative"],
    id: "KR-005"
  },
  {
    text: "Creative thinking and independent problem-solving. We support learning through conferences and workshops.",
    expected: ["innovative", "autonomous", "learning_focused"],
    id: "EN-002"
  },
  {
    text: "새로운 기술을 도전하고 크리에이티브한 솔루션을 찾는 팀입니다.",
    expected: ["innovative"],
    id: "KR-006"
  },
  {
    text: "민첩하게 대응하는 agile 개발팀에서 실시간 서비스를 운영합니다.",
    expected: ["fast_paced"],
    id: "KR-007"
  },
];

let passed = 0, failed = 0;
const failures = [];

for (const tc of tests) {
  const result = extractCultureKeywords(tc.text).sort();
  const expected = [...tc.expected].sort();
  const ok = result.length === expected.length && result.every((v, i) => v === expected[i]);
  if (ok) {
    passed++;
    console.log(`✅ ${tc.id}: ${JSON.stringify(result)}`);
  } else {
    failed++;
    failures.push(tc.id);
    console.log(`❌ ${tc.id}: got ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`);
  }
}

// === Integration test: culture score with extracted keywords ===
function calculateCultureScore(jobCultureKeywords, candidatePreferences) {
  if (!jobCultureKeywords || jobCultureKeywords.length === 0) return 70;
  let matches = 0;
  for (const kw of jobCultureKeywords) {
    const pref = candidatePreferences[kw];
    if (pref !== undefined && pref >= 0.6) matches++;
    else if (pref !== undefined && pref >= 0.3) matches += 0.5;
  }
  return Math.round(Math.min(100, (matches / jobCultureKeywords.length) * 100));
}

const candidate = {
  innovative: 0.8,
  collaborative: 0.7,
  autonomous: 0.6,
  structured: 0.4,
  fast_paced: 0.7,
  learning_focused: 0.8,
};

// Test: job with culture keywords vs job without
const withCulture = calculateCultureScore(["innovative", "collaborative", "learning_focused"], candidate);
const withoutCulture = calculateCultureScore([], candidate);
const mismatch = calculateCultureScore(["structured"], candidate);

const integrationTests = [
  { id: "CULTURE-SCORE-01", got: withCulture > 70, expect: true, desc: `culture-rich job scores >70: got ${withCulture}` },
  { id: "CULTURE-SCORE-02", got: withoutCulture === 70, expect: true, desc: `no-culture job defaults to 70` },
  { id: "CULTURE-SCORE-03", got: mismatch < 70, expect: true, desc: `mismatched culture scores <70: got ${mismatch}` },
  { id: "CULTURE-SCORE-04", got: withCulture > mismatch, expect: true, desc: `matching culture > mismatched culture: ${withCulture} > ${mismatch}` },
];

for (const t of integrationTests) {
  const ok = t.got === t.expect;
  if (ok) { passed++; console.log(`✅ ${t.id}: ${t.desc}`); }
  else { failed++; failures.push(t.id); console.log(`❌ ${t.id}: ${t.desc}`); }
}

console.log(`\n📊 Culture Extraction: ${passed}/${passed + failed} passed, ${failed} failed`);
if (failures.length) console.log(`Failed: ${failures.join(', ')}`);
process.exit(failed > 0 ? 1 : 0);
