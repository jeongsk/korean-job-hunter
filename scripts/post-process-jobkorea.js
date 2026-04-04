// Post-processing module for raw JobKorea scrape data
// Takes line-separated card text from agent-browser output and applies
// positional parsing + salary normalization.
// EXP-069: Created to normalize salary_min/salary_max for JobKorea-sourced jobs.
// EXP-077: Added career_stage derivation.
// EXP-080: Added skill inference from shared skill-inference module.

const { inferSkills, deriveCareerStage } = require('./skill-inference');

// deriveCareerStage now imported from skill-inference.js (EXP-091)
//
// Reuses normalizeSalary from post-process-wanted.js.

const { normalizeSalary, extractCultureKeywords, normalizeDeadline } = require('./post-process-wanted');

const CITY_PATTERN = /(서울|경기|부산|대전|인천|광주|대구|울산|판교|강남|영등포|송파|성수|역삼|잠실|마포|용산|구로|분당|일산|평촌|수원|이천|성남|중구)/;
const COMPANY_PREFIX = /^(㈜|\(주\)|주식회사)/;
const UI_NOISE = /스크랩\d*|지원\d*명|등록/;

/**
 * Parse a single JobKorea card's raw text into structured fields.
 * @param {string|object} raw - raw card text or object with .text
 * @returns {object} parsed job with salary_min/salary_max
 */
function parseJobKoreaCard(raw) {
  const text = typeof raw === 'string' ? raw : (raw.text || raw.raw || '');
  const lines = text.split(/\n/).map(s => s.trim()).filter(Boolean);

  let title = '', company = '', experience = '', location = '', deadline = '', salary = '';

  // Classify each line
  const classified = lines.map((line, idx) => {
    if (/마감|D-\d|상시모집|수시모집|상시채용|\d{4}[./-]\d{1,2}[./-]\d{1,2}/i.test(line)) return { type: 'deadline', line, idx };
    if (/^신입$/.test(line)) return { type: 'experience', line, idx };
    if (/^경력/.test(line)) {
      const rest = line.replace(/^경력\s*/, '');
      if (!rest || /^무관/.test(rest) || /^\d/.test(rest)) return { type: 'experience', line, idx };
    }
    if (/^(연봉|월급)\s*\d/.test(line) || /^면접후결정/.test(line)) return { type: 'salary', line, idx };
    if (UI_NOISE.test(line)) return { type: 'noise', line, idx };
    return { type: 'unknown', line, idx };
  });

  // Extract classified fields
  const dlEntry = classified.find(c => c.type === 'deadline');
  if (dlEntry) deadline = dlEntry.line;

  const expEntry = classified.find(c => c.type === 'experience');
  if (expEntry) experience = expEntry.line;

  const salEntry = classified.find(c => c.type === 'salary');
  if (salEntry) salary = salEntry.line;

  // Remaining unknowns: title, company, location
  const unknowns = classified.filter(c => c.type === 'unknown');

  let companyIdx = -1;
  let locationIdx = -1;

  // Company by prefix
  for (const u of unknowns) {
    if (COMPANY_PREFIX.test(u.line)) {
      company = u.line.replace(COMPANY_PREFIX, '').trim();
      companyIdx = u.idx;
      break;
    }
  }

  // Location: last city-matching unknown
  const cityMatches = unknowns.filter(u => u.idx !== companyIdx && CITY_PATTERN.test(u.line));
  if (cityMatches.length > 0) {
    const locEntry = cityMatches[cityMatches.length - 1];
    location = locEntry.line;
    locationIdx = locEntry.idx;
    if (!company && cityMatches.length >= 2) {
      company = cityMatches[0].line;
      companyIdx = cityMatches[0].idx;
    }
  }

  // Company fallback: positional
  if (!company) {
    for (const u of unknowns) {
      if (u.idx !== locationIdx) {
        if (!title) { title = u.line; }
        else { company = u.line; companyIdx = u.idx; break; }
      }
    }
  }

  // Title: first unknown not company/location
  if (!title) {
    for (const u of unknowns) {
      if (u.idx !== companyIdx && u.idx !== locationIdx) { title = u.line; break; }
    }
  }

  // Normalize salary
  let salary_min = null, salary_max = null;
  if (salary) {
    const norm = normalizeSalary(salary);
    if (norm) {
      salary_min = norm.min;
      salary_max = norm.max;
    }
  }

  // Culture keywords (reuse Wanted patterns for parity)
  const culture_keywords = extractCultureKeywords(text);

  // Work type detection
  const allText = lines.join(' ');
  let work_type = 'onsite';
  if (/전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|100%\s*remote/i.test(allText)) work_type = 'remote';
  else if (/하이브리드|주\d일\s*출근|hybrid/i.test(allText)) work_type = 'hybrid';

  // Employment type extraction (EXP-085)
  let employment_type = 'regular';
  if (/계약직|파견|위촉/i.test(allText)) employment_type = 'contract';
  else if (/인턴(십)?/i.test(allText)) employment_type = 'intern';
  else if (/프리랜서/i.test(allText)) employment_type = 'freelance';

  // Skill inference from title (EXP-080)
  const skills = inferSkills(title).join(', ');

  // Normalize deadline to ISO date (EXP-098)
  const deadlineNorm = normalizeDeadline(deadline);
  if (deadlineNorm) deadline = deadlineNorm;

  return {
    title, company, experience, salary, salary_min, salary_max,
    location, deadline, work_type, employment_type, culture_keywords, source: 'jobkorea',
    career_stage: deriveCareerStage(experience),
    skills
  };
}

// CLI: read JSON array from stdin
if (require.main === module) {
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const results = Array.isArray(input) ? input.map(parseJobKoreaCard) : [parseJobKoreaCard(input)];
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  });
}

module.exports = { parseJobKoreaCard, deriveCareerStage };
