#!/usr/bin/env node
// scrape-wanted-api.js — Wanted.co.kr API-based scraper (bypasses 403 bot detection)
// Uses Wanted's public search API endpoint instead of browser automation.
//
// Usage:
//   node scripts/scrape-wanted-api.js --keyword "프론트엔드" --limit 20
//   node scripts/scrape-wanted-api.js --keyword "원격" --limit 50 --offset 0
//
// Output: JSON array of structured job objects to stdout

const https = require('https');
const { URL } = require('url');
const { inferSkills, deriveCareerStage, deriveCareerStageFromTitle } = require('./skill-inference');
const { extractCultureKeywords, normalizeSalary, normalizeDeadline, extractSalaryLine } = require('./post-process-wanted');

// EXP-132: Wanted category_tag ID → role title mapping
// The search API returns category_tag.id on each position but no title.
// We maintain a known mapping so ambiguous titles like "Product Engineer"
// with category_tag.id=669 (프론트엔드 개발자) get appropriate skills.
const CATEGORY_MAP = {
  // EXP-140: Expanded from 17 to 35+ entries using live Wanted API data (April 2026).
  // category_tag.id → role title for skill inference fallback.
  // When title-based inference yields 0 skills, we use the category to infer skills.
  // Development (parent_id: 518)
  669: '프론트엔드 개발자',
  672: '백엔드 개발자',
  899: '풀스택 개발자',
  873: '시니어 개발자',
  939: '개발자',
  663: '소프트웨어 엔지니어',
  893: 'PHP 개발자',
  660: '자바 개발자',
  872: '서버 개발자',
  658: '임베디드 개발자',
  900: 'C,C++ 개발자',
  674: 'DevOps / 시스템 관리자',
  665: '시스템,네트워크 관리자',
  10231: 'DBA',
  10230: 'ERP전문가',
  1022: 'BI 엔지니어',
  1027: '블록체인 플랫폼 엔지니어',
  895: '머신러닝 엔지니어',
  1634: '머신러닝 엔지니어',
  655: '데이터 엔지니어',
  1025: '빅데이터 엔지니어',
  677: '안드로이드 개발자',
  678: 'iOS 개발자',
  676: 'QA,테스트 엔지니어',
  681: '보안 엔지니어',
  671: '보안 엔지니어',
  1024: '데이터 사이언티스트',
  656: '데이터 분석가',
  // Security (parent_id: 10566)
  10569: '보안관제',
  10567: '정보보호 컨설팅',
  // Product/Design
  794: '프로덕트 매니저',
  795: '프로덕트 디자이너',
  // Non-dev (parent_id: 507)
  565: '기획',
  // Game development (parent_id: 959)
  960: '게임 서버 개발자',
  961: '게임 클라이언트 개발자',
  962: '모바일 게임 개발자',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'x-wanted-language': 'ko',
        'Referer': 'https://www.wanted.co.kr/',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${e.message}\nData: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

/**
 * Clean company name from Wanted API by removing Korean legal entity prefixes.
 * Wanted API returns names like "(주)카카오", "주식회사 토스", "㈜배달의민족".
 * These prefixes break company matching, dedup, and NLP queries.
 */
function cleanCompanyName(name) {
  if (!name) return '회사명 미상';
  return name
    .replace(/^㈜\s*/, '')           // ㈜ prefix
    .replace(/^\(주\)\s*/, '')       // (주) prefix
    .replace(/^주식회사\s*/, '')     // 주식회사 prefix
    .replace(/^유한회사\s*/, '')     // 유한회사 prefix
    .replace(/^\(유\)\s*/, '')       // (유) prefix
    .trim() || '회사명 미상';
}

function parsePosition(pos) {
  const company = cleanCompanyName(pos.company?.name);
  const title = pos.position || '직무 미상';
  const id = String(pos.id || '');
  const link = id ? `https://www.wanted.co.kr/wd/${id}` : '';
  const location = pos.address?.location || '';
  const country = pos.address?.country || '';
  const employmentType = pos.employment_type || 'regular';
  const dueTime = pos.due_time || null;
  const reward = pos.reward?.formatted_total || '';
  const isNewbie = pos.is_newbie || false;

  // Derive experience from newbie flag (API doesn't give exact years)
  let experience = isNewbie ? '신입가능' : '경력';

  // Normalize deadline to ISO date
  const normalizedDeadline = normalizeDeadline(dueTime);

  // Derive career stage from experience text, then override with title if more specific
  const careerStage = deriveCareerStageFromTitle(title) || deriveCareerStage(experience);

  // Extract skills from title at search time (EXP-131)
  // Previously skills were always [] — only populated via --details flag.
  // Title-based inference gives meaningful skills for matching without detail fetch.
  let skills = inferSkills(title);

  // EXP-132: Use category_tag as fallback when title yields no skills.
  // API returns category_tag.id which maps to job role categories.
  // category_tags from the search response provides id→title mapping.
  if (skills.length === 0 && pos.category_tag?.id) {
    const catTitle = CATEGORY_MAP[pos.category_tag.id];
    if (catTitle) {
      const categorySkills = inferSkills(catTitle);
      if (categorySkills.length > 0) {
        skills = categorySkills;
      }
    }
  }

  return {
    id,
    title,
    company,
    experience,
    location,
    country,
    employment_type: employmentType === 'full_time' ? 'regular' : (employmentType || 'regular'),
    deadline: normalizedDeadline || dueTime,
    deadline_raw: dueTime,
    reward,
    link,
    source: 'wanted-api',
    work_type: detectWorkType(title),  // detect from title; enriched via detail page
    salary: null,         // enriched via detail page
    salary_min: null,
    salary_max: null,
    career_stage: careerStage,
    culture_keywords: [],
    skills,
  };
}

async function fetchDetail(wdId, title) {
  try {
    const data = await fetchJSON(`https://www.wanted.co.kr/api/v1/jobs/${wdId}?lang=ko`);
    // Wanted detail API returns flat structure with 'jd' as full description text
    const description = data?.jd || '';
    const fullLocation = data?.address?.full_location || data?.address?.location || '';
    const geoLocation = data?.address?.geo_location?.location || null;

    // Use shared skill inference (135+ skills) instead of inline patterns
    // EXP-142: Role map disabled for full JD text — company descriptions mentioning
    // "AI 분석", "클라우드 서비스" etc. cause massive false positives (python, tensorflow,
    // pytorch, aws, docker, kubernetes added to non-AI/non-cloud jobs).
    // Only explicit SKILL_MAP keywords are matched from description text.
    // Role-based inference was already applied at search time from the title.
    const descSkills = inferSkills(description, { includeRoleMap: false });
    const titleSkills = inferSkills(title); // includes role map
    const foundSkills = [...new Set([...titleSkills, ...descSkills])];

    // Extract culture keywords from JD text
    const cultureKeywords = extractCultureKeywords(description);

    // Detect work type from description
    const workType = detectWorkType(description);

    return {
      description,
      full_location: fullLocation,
      geo_location: geoLocation,
      skills: foundSkills,
      culture_keywords: cultureKeywords,
      work_type: workType,
      salary: null,
    };
  } catch {
    return { description: '', full_location: '', geo_location: null, skills: [], salary: null, work_type: null };
  }
}

/**
 * Extract specific experience year range from JD description text.
 * Returns extracted range string (e.g., "6년 이상", "3~5년") or null.
 */
function extractExperienceRange(description) {
  if (!description) return null;
  // Priority 1: "N년 이상" or "N년~M년 이상"
  let m = description.match(/(\d+)\s*년\s*~\s*(\d+)\s*년?\s*이상/);
  if (m) return `${m[1]}~${m[2]}년 이상`;
  // Priority 2: "N~M년" or "N-M년"
  m = description.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  if (m) return `${m[1]}~${m[2]}년`;
  // Priority 3: "N년 이상"
  m = description.match(/(\d+)\s*년\s*이상/);
  if (m) return `${m[1]}년 이상`;
  // Priority 4: "N년 차" or "N년차"
  m = description.match(/(\d+)\s*년\s*차/);
  if (m) return `${m[1]}년차`;
  // Priority 5: "신입" in qualification section
  if (/자격요건[^]*신입/.test(description)) return '신입';
  return null;
}

function detectWorkType(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/(전면\s*재택|완전\s*재택|풀\s*리모트|full\s*remote|100%\s*remote|원격\s*근무)/.test(t)) return 'remote';
  if (/(주\s*\d\s*일\s*출근|hybrid|하이브리드|부분\s*재택)/.test(t)) return 'hybrid';
  if (/(재택|remote|리모트|원격)/.test(t)) return 'remote';
  return 'onsite';
}

async function main() {
  const args = process.argv.slice(2);
  let keyword = '', limit = 20, offset = 0, withDetails = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keyword' || args[i] === '-k') keyword = args[++i];
    else if (args[i] === '--limit' || args[i] === '-l') limit = parseInt(args[++i]) || 20;
    else if (args[i] === '--offset' || args[i] === '-o') offset = parseInt(args[++i]) || 0;
    else if (args[i] === '--details' || args[i] === '-d') withDetails = true;
    else if (!keyword) keyword = args[i]; // positional keyword
  }

  if (!keyword) {
    console.error('Usage: node scrape-wanted-api.js --keyword "프론트엔드" [--limit 20] [--offset 0] [--details]');
    process.exit(1);
  }

  const encoded = encodeURIComponent(keyword);
  const url = `https://www.wanted.co.kr/api/chaos/search/v1/results?keyword=${encoded}&limit=${limit}&offset=${offset}&tab=position&query=${encoded}`;

  console.error(`[scrape-wanted-api] Searching: "${keyword}" (limit=${limit}, offset=${offset})`);

  let result;
  try {
    result = await fetchJSON(url);
  } catch (e) {
    console.error(`[scrape-wanted-api] API error: ${e.message}`);
    process.exit(1);
  }

  const positions = result?.positions?.data || [];
  console.error(`[scrape-wanted-api] Found ${positions.length} positions (total: ${result?.positions?.total_count || '?'})`);

  const jobs = positions.map(parsePosition);

  if (withDetails) {
    console.error(`[scrape-wanted-api] Fetching details for ${jobs.length} jobs...`);
    for (const job of jobs) {
      if (!job.id) continue;
      const detail = await fetchDetail(job.id, job.title);
      if (detail.skills?.length) job.skills = detail.skills;
      if (detail.culture_keywords?.length) job.culture_keywords = detail.culture_keywords;
      if (detail.work_type) job.work_type = detail.work_type;
      if (detail.full_location) job.full_location = detail.full_location;
      if (detail.geo_location) job.geo_location = detail.geo_location;
      if (detail.description) job.description = detail.description;
      // Extract salary from detail JD description (EXP-126)
      if (detail.description && !job.salary) {
        const salaryLine = extractSalaryLine(detail.description);
        if (salaryLine) {
          job.salary = salaryLine;
          const norm = normalizeSalary(salaryLine);
          if (norm) {
            job.salary_min = norm.min;
            job.salary_max = norm.max;
          }
        }
      }
      // Extract specific experience range from detail description
      if (detail.description) {
        const expRange = extractExperienceRange(detail.description);
        if (expRange) {
          job.experience = expRange;
        }
        // Re-derive career_stage: prefer title-based (e.g. "시니어" in title)
        // over experience-based (API may return wrong "신입" for senior roles)
        const titleStage = deriveCareerStageFromTitle(job.title);
        if (titleStage) {
          // Title-based stage is authoritative — don't override
          if (!job.career_stage || job.career_stage !== titleStage) {
            job.career_stage = titleStage;
          }
        } else if (expRange) {
          job.career_stage = deriveCareerStage(expRange);
        } else {
          // Fallback: derive from combined text
          const stage = deriveCareerStage(job.experience + ' ' + detail.description);
          if (stage && stage !== 'mid') job.career_stage = stage;
        }
      }
      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(JSON.stringify(jobs, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
