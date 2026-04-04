// Post-processing module for raw LinkedIn scrape data
// Enriches LinkedIn cards with experience level, skill inference, salary hints,
// and work_type detection from title and description text.
// EXP-070: Created to bring LinkedIn parsing to parity with Wanted/JobKorea.
//
// Usage:
//   node scripts/post-process-linkedin.js < input.json > output.json
//   const { parseLinkedInCard } = require('./scripts/post-process-linkedin');

const { normalizeSalary, extractCultureKeywords, normalizeDeadline } = require('./post-process-wanted');
const { inferSkills } = require('./skill-inference');

// === Location normalization ===
function normalizeLocation(loc) {
  if (!loc) return '';
  let l = loc.replace(/,?\s*South Korea\s*$/i, '').replace(/,?\s*대한민국\s*$/, '');
  const cities = [['Seoul','서울'],['Busan','부산'],['Suwon','수원'],['Pangyo','판교'],
    ['Incheon','인천'],['Daegu','대구'],['Daejeon','대전'],['Gwangju','광주'],['Ulsan','울산'],['Jeju','제주']];
  for (const [en, kr] of cities) {
    if (new RegExp('\\b'+en+'\\b','i').test(l)) {
      l = l.replace(new RegExp('\\b'+en+'\\b','i'), kr);
      break;
    }
  }
  return l.replace(/,?\s*Gyeonggi-do/i,' 경기도').replace(/,?\s*Gyeonggi/i,' 경기도')
    .replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
}

// === Seniority / experience level extraction from title ===
const SENIORITY_PATTERNS = [
  { pattern: /\b(mid[\s-]?senior|중급|경력\s*\d+~\d+년|\d\+\s*years?|\d\s*-\s*\d\s*years?)/i, level: 'mid', minYears: 3 },
  { pattern: /(?:^|[\s(\[/,]|\b)(intern|인턴)(?:$|[\s)\]/,]|$)/i, level: 'intern', minYears: 0 },
  { pattern: /(?:^|[\s(\[/,]|받)(principal|staff|tech\s*lead)(?:$|[\s)\]/,]|$)/i, level: 'lead', minYears: 10 },
  { pattern: /(?:^|[\s(\[/,]|받)(lead)(?:$|[\s)\]/,]|$)/i, level: 'lead', minYears: 8 },
  { pattern: /(?:^|[\s(\[/,]|받)(senior|sr\.?)(?:$|[\s)\]/,]|$)/i, level: 'senior', minYears: 5 },
  { pattern: /(?:^|[\s(\[/,]|받)(junior|entry[\s-]?level|jr\.?|신입|associate|초보)(?:$|[\s)\]/,]|$)/i, level: 'junior', minYears: 0 },
];

function extractExperienceLevel(title, description = '') {
  const text = `${title} ${description}`;
  for (const { pattern, level, minYears } of SENIORITY_PATTERNS) {
    if (pattern.test(text)) return { level, minYears };
  }
  // Try Korean N-style: N년차, N년 이상
  const koreanExp = text.match(/(\d+)\s*년(?:차|이상)/);
  if (koreanExp) return { level: 'mid', minYears: parseInt(koreanExp[1]) };
  return { level: '', minYears: null };
}

// === Skill inference from title (reuse title-based patterns) ===
const TECH_PATTERNS = [
  /react\s*native/i, /react/i, /vue\.?js/i, /angular/i, /svelte/i, /next\.?js/i, /nuxt/i, /typescript/i,
  /node\.?js/i, /python/i, /java\b/i, /go\b\b/i, /rust/i, /swift/i, /kotlin/i, /flutter/i, /dart\b/i,
  /ruby\b/i, /php\b/i, /c\+\+/i, /c#/, /\.net/i, /golang/i,
  /aws\b/i, /gcp\b/i, /azure/i, /kubernetes/i, /\bk8s\b/i, /docker/i, /terraform/i, /jenkins/i,
  /kafka/i, /graphql/i, /\brest\b/i, /\bgitlab\b/i, /elasticsearch/i,
  /machine\s*learning/i, /\bai\b/i, /data\s*engineer/i, /\bml\b/i,
  /figma/i, /sketch/i, /photoshop/i,
  /spring\s*boot/i, /spring\b/i, /django/i, /flask/i, /express\b/i, /nestjs/i, /fastapi/i,
  /swiftui/i, /jetpack\s*compose/i,
];

function inferSkillsFromText(title, description = '') {
  const text = `${title} ${description}`;
  const skills = new Set();
  for (const pat of TECH_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      // Normalize skill name
      let skill = m[0].replace(/[.]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (skill === 'k8s') skill = 'kubernetes';
      if (skill === 'golang') skill = 'go';
      skills.add(skill);
    }
  }
  return [...skills];
}

// === Salary extraction from description text ===
function extractSalary(text) {
  if (!text) return { salary: '', salary_min: null, salary_max: null };
  // Korean patterns: 연봉 NNNN~MMMM만원, 월급 NNN~MMM만원, 면접후결정
  const annualRange = text.match(/연봉\s*(\d+)\s*[~\-]\s*(\d+)\s*만원/);
  if (annualRange) {
    const raw = `연봉 ${annualRange[1]}~${annualRange[2]}만원`;
    const norm = normalizeSalary(raw);
    return { salary: raw, salary_min: norm.min, salary_max: norm.max };
  }
  const annualSingle = text.match(/연봉\s*(\d+)\s*만원(?:\s*이상)?/);
  if (annualSingle) {
    const raw = `연봉 ${annualSingle[1]}만원`;
    const norm = normalizeSalary(raw);
    return { salary: raw, salary_min: norm.min, salary_max: norm.max };
  }
  const monthlyRange = text.match(/월급\s*(\d+)\s*[~\-]\s*(\d+)\s*만원/);
  if (monthlyRange) {
    const raw = `월급 ${monthlyRange[1]}~${monthlyRange[2]}만원`;
    const norm = normalizeSalary(raw);
    return { salary: raw, salary_min: norm.min, salary_max: norm.max };
  }
  // 억 pattern
  const eokRange = text.match(/연봉\s*(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
  if (eokRange) {
    const raw = `연봉 ${eokRange[1]}~${eokRange[2]}억`;
    const norm = normalizeSalary(raw);
    return { salary: raw, salary_min: norm.min, salary_max: norm.max };
  }
  if (/면접후결정|협의/.test(text)) {
    return { salary: '면접후결정', salary_min: null, salary_max: null };
  }
  return { salary: '', salary_min: null, salary_max: null };
}

// === Work type detection ===
function detectWorkType(text) {
  if (/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|100%\s*remote/i.test(text)) return 'remote';
  if (/하이브리드|주\d일\s*출근|hybrid/i.test(text)) return 'hybrid';
  return 'onsite';
}

// === Main parser ===
function parseLinkedInCard(raw) {
  // Accept string or object
  let title = '', company = '', location = '', link = '', description = '';
  if (typeof raw === 'string') {
    // Try JSON parse
    try { raw = JSON.parse(raw); } catch { raw = { title: raw }; }
  }
  title = (raw.title || '').trim();
  company = (raw.company || '').trim();
  location = normalizeLocation(raw.location || '');
  link = (raw.link || '').replace(/\?.*$/, '').trim();
  description = (raw.description || raw.snippet || '').trim();

  // Experience level
  const { level, minYears } = extractExperienceLevel(title, description);

  // Skills — use shared skill-inference module (122 skills) instead of inline TECH_PATTERNS (EXP-114)
  const skills = inferSkills(`${title} ${description}`);

  // Salary
  const salaryInfo = extractSalary(description || title);

  // Work type
  const work_type = detectWorkType(`${title} ${description}`);

  // Employment type (EXP-085)
  const combinedText = `${title} ${description}`;
  let employment_type = 'regular';
  if (/contract|계약직|파견|위촉|temporary/i.test(combinedText)) employment_type = 'contract';
  else if (/intern|인턴(십)?/i.test(combinedText)) employment_type = 'intern';
  else if (/freelance|프리랜서/i.test(combinedText)) employment_type = 'freelance';

  // Clean title: remove seniority prefixes in brackets
  let cleanTitle = title;

  // Culture keywords (reuse Wanted patterns for parity)
  const culture_keywords = extractCultureKeywords(`${title} ${description}`);

  return {
    title: cleanTitle,
    company,
    location,
    link,
    experience: level,
    experience_min_years: minYears,
    skills: skills.join(', '),
    work_type,
    employment_type,
    salary: salaryInfo.salary,
    salary_min: salaryInfo.salary_min,
    salary_max: salaryInfo.salary_max,
    culture_keywords,
    career_stage: deriveCareerStage(level, minYears),
    source: 'linkedin',
  };
}

// CLI mode
if (require.main === module) {
  const chunks = [];
  process.stdin.on('data', d => chunks.push(d));
  process.stdin.on('end', () => {
    const input = Buffer.concat(chunks).toString();
    try {
      const jobs = JSON.parse(input);
      const results = Array.isArray(jobs) ? jobs.map(parseLinkedInCard) : [parseLinkedInCard(jobs)];
      console.log(JSON.stringify(results, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
      process.exit(1);
    }
  });
}

module.exports = { parseLinkedInCard, normalizeLocation, extractExperienceLevel, inferSkillsFromText, extractSalary, detectWorkType, deriveCareerStage };

// === Career Stage Derivation (EXP-077) ===
// LinkedIn uses extracted level + minYears, not Korean experience text
function deriveCareerStage(level, minYears) {
  if (level === 'lead') return 'lead';
  if (level === 'senior') return 'senior';
  if (level === 'mid') return 'mid';
  if (level === 'junior') return 'junior';
  if (level === 'intern') return 'entry';
  // For empty level, try minYears
  if (minYears !== null && minYears !== undefined) {
    if (minYears <= 1) return 'entry';
    if (minYears <= 3) return 'junior';
    if (minYears <= 7) return 'mid';
    if (minYears <= 12) return 'senior';
    return 'lead';
  }
  return null;
}
