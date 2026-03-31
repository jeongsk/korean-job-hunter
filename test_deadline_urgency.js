#!/usr/bin/env node
/**
 * EXP-035: Deadline-aware urgency scoring tests
 * Tests urgency computation, deadline Korean NLP patterns, and urgency-aware sorting
 */

const { execSync } = require('child_process');
const path = require('path');

// --- Urgency computation ---
function computeUrgency(deadlineStr) {
  if (!deadlineStr) return null;
  
  // Parse various deadline formats
  let deadlineDate;
  
  // "2026.04.15" or "2026-04-15"
  const ymdMatch = deadlineStr.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
  if (ymdMatch) {
    deadlineDate = new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
  }
  
  // "04/15" or "4/15" (assume current year or next year if past)
  if (!deadlineDate) {
    const mdMatch = deadlineStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (mdMatch) {
      const now = new Date();
      const year = now.getFullYear();
      deadlineDate = new Date(year, parseInt(mdMatch[1]) - 1, parseInt(mdMatch[2]));
      if (deadlineDate < now) deadlineDate.setFullYear(year + 1);
    }
  }
  
  // "상시" or "수시" = no deadline
  if (/상시|수시/.test(deadlineStr)) return { urgency: 'none', daysUntil: Infinity };
  
  if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  
  let urgency;
  if (daysUntil < 0) urgency = 'expired';
  else if (daysUntil <= 3) urgency = 'critical';
  else if (daysUntil <= 7) urgency = 'high';
  else if (daysUntil <= 14) urgency = 'medium';
  else urgency = 'low';
  
  return { urgency, daysUntil, deadlineDate };
}

// --- Korean NLP deadline query patterns ---
function parseDeadlineQuery(input) {
  const text = input.trim();
  const result = { hasDeadlineFilter: false, urgencyLevel: null, sqlFilter: null, order: null };
  
  // "마감임박" / "곧마감" / "이번주 마감"
  if (/마감\s*임박|곧\s*마감/.test(text)) {
    result.hasDeadlineFilter = true;
    result.urgencyLevel = 'critical+high';
    result.sqlFilter = "j.deadline IS NOT NULL AND j.deadline != '' AND j.deadline NOT LIKE '%상시%' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7";
    return result;
  }
  
  // "이번 주 마감" / "이번주 끝나는"
  if (/이번\s*주\s*마감|이번주\s*(끝|까)/.test(text)) {
    result.hasDeadlineFilter = true;
    result.urgencyLevel = 'this-week';
    result.sqlFilter = "j.deadline IS NOT NULL AND j.deadline != '' AND j.deadline NOT LIKE '%상시%' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7";
    return result;
  }
  
  // "오늘 마감" / "내일 마감"
  const dayMatch = text.match(/(오늘|내일|모레)\s*마감/);
  if (dayMatch) {
    const dayMap = { '오늘': 0, '내일': 1, '모레': 2 };
    const days = dayMap[dayMatch[1]];
    result.hasDeadlineFilter = true;
    result.urgencyLevel = days === 0 ? 'critical' : 'high';
    result.sqlFilter = `j.deadline IS NOT NULL AND j.deadline != '' AND CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = ${days}`;
    return result;
  }
  
  // "N일 남은" / "며칠 남은"
  const remainMatch = text.match(/(\d+)\s*일\s*(남|남은|안에)/);
  if (remainMatch) {
    const days = parseInt(remainMatch[1]);
    result.hasDeadlineFilter = true;
    result.urgencyLevel = days <= 3 ? 'critical' : days <= 7 ? 'high' : 'medium';
    result.sqlFilter = `j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND ${days}`;
    return result;
  }
  
  // "마감순" / "마감 빠른순"
  if (/마감\s*순|마감\s*빠른/.test(text)) {
    result.hasDeadlineFilter = true;
    result.order = "j.deadline ASC";
    return result;
  }
  
  // "기한 있는" / "데드라인 있는"
  if (/기한\s*있|데드라인\s*있|마감일\s*있/.test(text)) {
    result.hasDeadlineFilter = true;
    result.sqlFilter = "j.deadline IS NOT NULL AND j.deadline != '' AND j.deadline NOT LIKE '%상시%'";
    return result;
  }
  
  return result;
}

// --- Tests ---
let passed = 0, failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// Urgency computation tests
const now = new Date();
const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;

const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
const in3days = new Date(now); in3days.setDate(now.getDate() + 3);
const in5days = new Date(now); in5days.setDate(now.getDate() + 5);
const in10days = new Date(now); in10days.setDate(now.getDate() + 10);
const in20days = new Date(now); in20days.setDate(now.getDate() + 20);
const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

assert('urgency: 1 day left → critical', computeUrgency(fmt(tomorrow))?.urgency === 'critical');
assert('urgency: 3 days left → critical', computeUrgency(fmt(in3days))?.urgency === 'critical');
assert('urgency: 5 days left → high', computeUrgency(fmt(in5days))?.urgency === 'high');
assert('urgency: 10 days left → medium', computeUrgency(fmt(in10days))?.urgency === 'medium');
assert('urgency: 20 days left → low', computeUrgency(fmt(in20days))?.urgency === 'low');
assert('urgency: past deadline → expired', computeUrgency(fmt(yesterday))?.urgency === 'expired');
assert('urgency: 상시 → none', computeUrgency('상시')?.urgency === 'none');
assert('urgency: 수시채용 → none', computeUrgency('수시채용')?.urgency === 'none');
assert('urgency: null → null', computeUrgency(null) === null);
assert('urgency: empty → null', computeUrgency('') === null);
assert('urgency: YYYY-MM-DD format', computeUrgency(fmt(in5days).replace(/\./g, '-'))?.urgency === 'high');

// Korean NLP deadline query tests
let r;

r = parseDeadlineQuery('마감임박한 공고 있어?');
assert('nlp: 마감임박', r.hasDeadlineFilter && r.urgencyLevel === 'critical+high' && r.sqlFilter?.includes('7'));

r = parseDeadlineQuery('곧 마감되는 거');
assert('nlp: 곧 마감', r.hasDeadlineFilter && r.urgencyLevel === 'critical+high');

r = parseDeadlineQuery('이번 주 마감 공고');
assert('nlp: 이번 주 마감', r.hasDeadlineFilter && r.sqlFilter?.includes('7'));

r = parseDeadlineQuery('오늘 마감인 거');
assert('nlp: 오늘 마감', r.hasDeadlineFilter && r.urgencyLevel === 'critical' && r.sqlFilter?.includes('= 0'));

r = parseDeadlineQuery('내일 마감');
assert('nlp: 내일 마감', r.hasDeadlineFilter && r.sqlFilter?.includes('= 1'));

r = parseDeadlineQuery('3일 남은 공고');
assert('nlp: 3일 남은', r.hasDeadlineFilter && r.sqlFilter?.includes('BETWEEN 0 AND 3'));

r = parseDeadlineQuery('7일 안에 마감');
assert('nlp: 7일 안에', r.hasDeadlineFilter && r.sqlFilter?.includes('BETWEEN 0 AND 7'));

r = parseDeadlineQuery('마감순으로 보여줘');
assert('nlp: 마감순', r.hasDeadlineFilter && r.order === 'j.deadline ASC');

r = parseDeadlineQuery('마감 빠른순');
assert('nlp: 마감 빠른순', r.hasDeadlineFilter && r.order === 'j.deadline ASC');

r = parseDeadlineQuery('기한 있는 공고');
assert('nlp: 기한 있는', r.hasDeadlineFilter && r.sqlFilter?.includes('NOT LIKE'));

r = parseDeadlineQuery('데드라인 있는 거');
assert('nlp: 데드라인 있는', r.hasDeadlineFilter);

r = parseDeadlineQuery('백엔드 공고 보여줘');
assert('nlp: no deadline filter for unrelated query', !r.hasDeadlineFilter);

// Days until calculation accuracy
const u = computeUrgency(fmt(tomorrow));
assert('urgency: daysUntil accuracy', u?.daysUntil === 1, `got ${u?.daysUntil}`);

console.log(`\n${passed}/${passed + failed} deadline urgency tests passed`);
if (failed > 0) process.exit(1);
