#!/usr/bin/env node
/**
 * Cross-source job deduplication script.
 * Finds and merges duplicate job postings across Wanted, JobKorea, LinkedIn.
 * Uses fuzzy title matching with Korean↔English equivalents + company normalization.
 *
 * Usage:
 *   node scripts/dedup-jobs.js [--dry-run] [--json]
 *
 * Reads from jobs table in data/jobs.db.
 * With --dry-run: shows what would be merged without modifying DB.
 * With --json: outputs JSON array of duplicate groups.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, '..', 'data', 'jobs.db');
const DRY_RUN = process.argv.includes('--dry-run');
const JSON_OUT = process.argv.includes('--json');

// ── Normalization helpers ──

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[\-_\/\\·]+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(주|㈜|주식회사|유한회사)\s*/, '')
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

// ── Korean↔English company equivalents (synced from test_cross_source_dedup.js) ──

const companyKoEnMap = {
  '카카오': 'kakao', '네이버': 'naver', '라인': 'line', '토스': 'toss',
  '당근마켓': 'danggeun', '배달의민족': 'baemin', '우아한형제들': 'woowa',
  '삼성': 'samsung', '쿠팡': 'coupang', '다음': 'daum',
  '현대': 'hyundai', '엘지': 'lg', '케이티': 'kt', 'sk': 'sk',
  '카카오뱅크': 'kakaobank', '카카오페이': 'kakaopay', '네이버클라우드': 'navercloud',
  '삼성전자': 'samsungelectronics', '토스뱅크': 'tossbank',
  '리멤버': 'remember', '야놀자': 'yanolja', '직방': 'zigbang',
  '스마일게이트': 'smilegate', '펄플닷': 'purpledot', '그린랩스': 'greenlabs',
  '마켓컬리': 'kurly', '리디': 'ridi',
};

function companyToCanonical(name) {
  const n = companyNormalize(name);
  if (!n) return '';
  if (companyKoEnMap[n]) return companyKoEnMap[n];
  for (const [, en] of Object.entries(companyKoEnMap)) {
    if (n === en) return en;
  }
  return n;
}

function companyMatch(a, b) {
  const na = companyNormalize(a);
  const nb = companyNormalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  // Korean↔English company equivalents
  const ca = companyToCanonical(a);
  const cb = companyToCanonical(b);
  return ca === cb;
}

// ── Similarity scoring ──

const koEnMap = {
  '프론트엔드': 'frontend', '백엔드': 'backend', '풀스택': 'fullstack',
  '개발자': 'developer', '엔지니어': 'engineer', '데이터': 'data',
  '분석가': 'analyst', '디자이너': 'designer', '매니저': 'manager',
  '데브옵스': 'devops', '모바일': 'mobile', '인프라': 'infrastructure',
};
const enKoMap = {};
for (const [k, v] of Object.entries(koEnMap)) enKoMap[v] = k;

function titleSimilarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;

  const nac = na.replace(/\s/g, '');
  const nbc = nb.replace(/\s/g, '');
  if (nac === nbc) return 1.0;
  if (nac.includes(nbc) || nbc.includes(nac)) return 0.9;

  const tokenize = s => {
    const tokens = new Set();
    (s.match(/[가-힣]{2,}/g) || []).forEach(t => {
      tokens.add(t);
      if (koEnMap[t]) tokens.add(koEnMap[t]);
    });
    (s.match(/[a-z]{2,}/g) || []).forEach(t => {
      tokens.add(t);
      if (enKoMap[t]) tokens.add(enKoMap[t]);
    });
    return tokens;
  };
  const ta = tokenize(na);
  const tb = tokenize(nb);
  if (ta.size === 0 && tb.size === 0) return 0;

  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  return intersection / new Set([...ta, ...tb]).size;
}

function isDuplicate(jobA, jobB) {
  if (!companyMatch(jobA.company, jobB.company)) return false;
  return titleSimilarity(jobA.title, jobB.title) >= 0.6;
}

// ── Field completeness scoring (for merge priority) ──

function fieldScore(job) {
  let score = 0;
  if (job.title) score++;
  if (job.company) score++;
  if (job.salary && job.salary.trim()) score += 2;
  if (job.deadline && job.deadline.trim()) score += 2;
  if (job.experience && job.experience.trim()) score++;
  if (job.work_type && job.work_type.trim()) score++;
  if (job.location && job.location.trim()) score++;
  if (job.content && job.content.trim()) score += 2;
  if (job.skills && job.skills.trim()) score += 3;  // Skills are high-value (35% match weight)
  if (job.culture_keywords && job.culture_keywords.trim()) score += 1;
  if (job.employment_type && job.employment_type !== 'regular') score += 1;  // Non-default employment_type carries info
  // Prefer Wanted (usually richer)
  if (job.source === 'wanted') score += 1;
  return score;
}

// ── Main ──

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ data/jobs.db not found');
    process.exit(1);
  }

  const raw = execSync(`sqlite3 -json "${DB_PATH}" "SELECT id, source, title, company, url, content, location, work_type, experience, salary, deadline, reward, skills, culture_keywords, employment_type, career_stage FROM jobs ORDER BY id"`, { encoding: 'utf8' });
  const jobs = JSON.parse(raw);

  if (jobs.length === 0) {
    console.log('No jobs in database.');
    return;
  }

  // Find duplicate groups
  const assigned = new Set();
  const groups = [];

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

  if (groups.length === 0) {
    console.log(`✅ Checked ${jobs.length} jobs — no cross-source duplicates found.`);
    if (JSON_OUT) console.log('[]');
    return;
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(groups.map(g => g.map(i => ({
      id: jobs[i].id, source: jobs[i].source, title: jobs[i].title,
      company: jobs[i].company, url: jobs[i].url, fieldScore: fieldScore(jobs[i])
    }))), null, 2));
    return;
  }

  let totalDupes = 0;
  const toRemove = [];

  for (const group of groups) {
    // Pick best entry (highest field score)
    const entries = group.map(i => ({ idx: i, ...jobs[i], score: fieldScore(jobs[i]) }));
    entries.sort((a, b) => b.score - a.score);
    const keeper = entries[0];
    const dupes = entries.slice(1);

    // Enrich keeper with fields from dupes if missing
    const enrichFields = ['skills', 'culture_keywords', 'employment_type', 'salary', 'deadline', 'experience', 'work_type', 'location', 'career_stage'];
    const enrichUpdates = {};
    for (const field of enrichFields) {
      if ((!keeper[field] || !keeper[field].trim()) && !enrichUpdates[field]) {
        for (const d of dupes) {
          if (d[field] && d[field].trim()) {
            enrichUpdates[field] = d[field].trim();
            break;
          }
        }
      }
    }

    console.log(`\n🔄 Duplicate group (${entries.length} entries):`);
    console.log(`   ✅ KEEP [${keeper.source}] ${keeper.title} @ ${keeper.company} (score: ${keeper.score})`);
    if (Object.keys(enrichUpdates).length > 0) {
      console.log(`   📝 Enriching with: ${Object.keys(enrichUpdates).join(', ')} (from duplicate)`);
    }
    for (const d of dupes) {
      console.log(`   ❌ REMOVE [${d.source}] ${d.title} @ ${d.company} (score: ${d.score})`);
      toRemove.push({ id: d.id, enrich: enrichUpdates });
    }
    totalDupes += dupes.length;

    // Apply enrichment before deletion
    if (!DRY_RUN && Object.keys(enrichUpdates).length > 0) {
      const setClauses = Object.entries(enrichUpdates)
        .map(([k, v]) => `${k} = '${v.replace(/'/g, "''")}'`)
        .join(', ');
      execSync(`sqlite3 "${DB_PATH}" "UPDATE jobs SET ${setClauses} WHERE id = '${keeper.id}'"`, { encoding: 'utf8' });
    }
  }

  if (DRY_RUN) {
    console.log(`\n📋 DRY RUN: Would remove ${totalDupes} duplicate(s) from ${groups.length} group(s).`);
  } else {
    // Remove duplicates, keeping the best entry
    for (const entry of toRemove) {
      const id = typeof entry === 'object' ? entry.id : entry;
      // Also remove related matches and applications
      execSync(`sqlite3 "${DB_PATH}" "DELETE FROM matches WHERE job_id = '${id}'"`, { encoding: 'utf8' });
      execSync(`sqlite3 "${DB_PATH}" "DELETE FROM applications WHERE job_id = '${id}'"`, { encoding: 'utf8' });
      execSync(`sqlite3 "${DB_PATH}" "DELETE FROM jobs WHERE id = '${id}'"`, { encoding: 'utf8' });
    }
    console.log(`\n✅ Removed ${totalDupes} duplicate(s) from ${groups.length} group(s).`);
  }

  console.log(`📊 Total jobs: ${jobs.length} → ${jobs.length - totalDupes} (after dedup)`);
}

main();
