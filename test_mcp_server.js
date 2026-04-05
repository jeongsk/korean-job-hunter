#!/usr/bin/env node
/**
 * test_mcp_server.js — Test suite for MCP server database operations
 * EXP-134: First test coverage for the MCP server
 * 
 * Tests the SQL schema, filter logic, and CRUD operations
 * using the same SQL that the MCP server executes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TMP_DB = path.join(__dirname, 'test_mcp_' + Date.now() + '.db');
let passed = 0;
let failed = 0;

function sql(cmd) {
  return execSync(`sqlite3 -json "${TMP_DB}" "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

function sqlRun(cmd) {
  return execSync(`sqlite3 "${TMP_DB}" "PRAGMA foreign_keys = ON; ${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function setupDB() {
  // Create schema matching MCP server
  execSync(`sqlite3 "${TMP_DB}" "PRAGMA foreign_keys = ON;

    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL,
      company TEXT NOT NULL, url TEXT UNIQUE NOT NULL, content TEXT,
      location TEXT, office_address TEXT, work_type TEXT, commute_min INTEGER,
      experience TEXT, salary TEXT, salary_min INTEGER, salary_max INTEGER,
      deadline TEXT, reward TEXT, culture_keywords TEXT, skills TEXT DEFAULT '',
      employment_type TEXT DEFAULT 'regular', career_stage TEXT,
      created_at TEXT DEFAULT (datetime('now')), fetched_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE matches (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
      resume_hash TEXT NOT NULL, score INTEGER NOT NULL,
      skill_score INTEGER, location_score INTEGER, report TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE applications (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
      status TEXT NOT NULL DEFAULT 'interested', memo TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  "`);
}

function seedData() {
  // Jobs
  const jobs = [
    ["j1","wanted","프론트엔드 개발자","카카오","https://w.co/1","React TS","서울","hybrid",30,"경력 3년 이상","연봉 5000~8000만원",5000,8000,"2026-04-30","react,typescript,javascript","regular","mid"],
    ["j2","jobkorea","백엔드 개발자","네이버","https://jk.co/2","Java Spring","경기 성남","onsite",60,"경력 5년 이상","연봉 6000~10000만원",6000,10000,"2026-04-15","java,spring,mysql","regular","senior"],
    ["j3","linkedin","Full Stack Developer","Toss","https://li.co/3","Node React","서울 영등포구","remote",null,"경력 2년 이상","면접후결정",null,null,null,"node.js,react,typescript","regular","mid"],
    ["j4","wanted","DevOps 엔지니어","라인","https://w.co/4","AWS Docker K8s","서울","hybrid",45,"경력 7년 이상","연봉 8000~12000만원",8000,12000,"2026-05-01","docker,kubernetes,aws,ci/cd","regular","senior"],
    ["j5","jobkorea","데이터 엔지니어","쿠팡","https://jk.co/5","Spark Airflow","부산","onsite",90,"경력 3년 이상","연봉 5000~7000만원",5000,7000,"2026-04-20","spark,airflow,python","contract","mid"],
    ["j6","wanted","iOS 개발자","배달의민족","https://w.co/6","Swift SwiftUI","서울","remote",null,"신입·경력","연봉 4000~6000만원",4000,6000,null,"swift,swiftui","regular","junior"],
    ["j7","linkedin","ML Engineer","Samsung","https://li.co/7","Python TF","수원","onsite",null,"경력 10년 이상","연봉 1~2억",10000,20000,null,"python,tensorflow,pytorch","regular","lead"],
  ];
  
  for (const j of jobs) {
    sqlRun(`INSERT OR REPLACE INTO jobs (id,source,title,company,url,content,location,work_type,commute_min,experience,salary,salary_min,salary_max,deadline,skills,employment_type,career_stage) VALUES ('${j[0]}','${j[1]}','${j[2]}','${j[3]}','${j[4]}','${j[5]}','${j[6]}','${j[7]}',${j[8]===null?'NULL':j[8]},'${j[9]}','${j[10]}',${j[11]===null?'NULL':j[11]},${j[12]===null?'NULL':j[12]},${j[13]===null?'NULL':"'"+j[13]+"'"},'${j[14]}','${j[15]}','${j[16]}')`);
    const appId = crypto.randomUUID();
    sqlRun(`INSERT OR IGNORE INTO applications (id, job_id) VALUES ('${appId}', '${j[0]}')`);
  }
  
  // Matches
  sqlRun("INSERT INTO matches (id,job_id,resume_hash,score,skill_score,location_score) VALUES ('m1','j1','hash1',92,88,95)");
  sqlRun("INSERT INTO matches (id,job_id,resume_hash,score,skill_score,location_score) VALUES ('m2','j2','hash1',35,20,50)");
  sqlRun("INSERT INTO matches (id,job_id,resume_hash,score,skill_score,location_score) VALUES ('m3','j3','hash1',85,80,90)");
  sqlRun("INSERT INTO matches (id,job_id,resume_hash,score,skill_score,location_score) VALUES ('m4','j4','hash1',60,55,70)");
}

// ── Tests ──

function testSchema() {
  console.log('\n📋 Schema Tests');
  const cols = JSON.parse(sql("PRAGMA table_info(jobs)")).map(c => c.name);
  const required = ['id','source','title','company','url','content','location','office_address',
    'work_type','commute_min','experience','salary','salary_min','salary_max',
    'deadline','reward','culture_keywords','skills','employment_type','career_stage'];
  for (const c of required) {
    assert(cols.includes(c), `jobs table has column: ${c}`);
  }
  assert(cols.length >= 21, `jobs table has ${cols.length} columns (>= 21)`);
  
  const matchCols = JSON.parse(sql("PRAGMA table_info(matches)")).map(c => c.name);
  assert(matchCols.includes('score'), 'matches has score');
  assert(matchCols.includes('skill_score'), 'matches has skill_score');
  
  const appCols = JSON.parse(sql("PRAGMA table_info(applications)")).map(c => c.name);
  assert(appCols.includes('status'), 'applications has status');
  assert(appCols.includes('memo'), 'applications has memo');
}

function testSaveJob() {
  console.log('\n💾 Save Job Tests');
  const id = crypto.randomUUID();
  sqlRun(`INSERT OR REPLACE INTO jobs (id,source,title,company,url,content,location,work_type,salary_min,salary_max,skills,employment_type,career_stage) VALUES ('${id}','wanted','테스트 직무','테스트회사','https://test.com/${id}','JD','판교','remote',5000,8000,'react,typescript','regular','mid')`);
  
  const row = JSON.parse(sql(`SELECT * FROM jobs WHERE id = '${id}'`))[0];
  assert(row.title === '테스트 직무', 'Insert job: title correct');
  assert(row.salary_min === 5000, 'Insert job: salary_min correct');
  assert(row.skills === 'react,typescript', 'Insert job: skills correct');
  assert(row.employment_type === 'regular', 'Insert job: employment_type correct');
  assert(row.career_stage === 'mid', 'Insert job: career_stage correct');
  
  // UPSERT
  sqlRun(`INSERT OR REPLACE INTO jobs (id,source,title,company,url,content) VALUES ('${id}','wanted','업데이트된 직무','테스트회사','https://test.com/${id}','Updated JD')`);
  const updated = JSON.parse(sql(`SELECT * FROM jobs WHERE id = '${id}'`))[0];
  assert(updated.title === '업데이트된 직무', 'UPSERT updates title');
  
  // Auto-application (MCP server does this)
  const appId = crypto.randomUUID();
  sqlRun(`INSERT OR IGNORE INTO applications (id, job_id) VALUES ('${appId}', '${id}')`);
  const app = JSON.parse(sql(`SELECT * FROM applications WHERE job_id = '${id}'`))[0];
  assert(app !== undefined, 'Auto-application created');
  assert(app.status === 'interested', 'Auto-application status is interested');
}

function testSearchFilters() {
  console.log('\n🔍 Search Filter Tests');
  
  // Source filter
  const wanted = JSON.parse(sql("SELECT * FROM jobs WHERE source = 'wanted'"));
  assert(wanted.length === 4, `Source 'wanted': ${wanted.length} jobs`);  // j1,j4,j6
  
  // Work type
  const remote = JSON.parse(sql("SELECT * FROM jobs WHERE work_type = 'remote'"));
  assert(remote.length === 2, `Work type 'remote': ${remote.length} jobs`);
  
  // Salary range
  const highSalary = JSON.parse(sql("SELECT * FROM jobs WHERE salary_min >= 6000"));
  assert(highSalary.length === 3, `Salary min >= 6000: ${highSalary.length} jobs`);
  
  // Location LIKE
  const seoul = JSON.parse(sql("SELECT * FROM jobs WHERE location LIKE '%서울%'"));
  assert(seoul.length === 4, `Location '서울': ${seoul.length} jobs`);
  
  // Skills LIKE
  const react = JSON.parse(sql("SELECT * FROM jobs WHERE skills LIKE '%react%'"));
  assert(react.length === 2, `Skills 'react': ${react.length} jobs`);
  
  // Employment type
  const regular = JSON.parse(sql("SELECT * FROM jobs WHERE employment_type = 'regular'"));
  assert(regular.length === 7, `Employment 'regular': ${regular.length} jobs`);
  
  const contract = JSON.parse(sql("SELECT * FROM jobs WHERE employment_type = 'contract'"));
  assert(contract.length === 1, `Employment 'contract': ${contract.length} jobs`);
  
  // Career stage
  const senior = JSON.parse(sql("SELECT * FROM jobs WHERE career_stage = 'senior'"));
  assert(senior.length === 2, `Career 'senior': ${senior.length} jobs`);
  
  const lead = JSON.parse(sql("SELECT * FROM jobs WHERE career_stage = 'lead'"));
  assert(lead.length === 1, `Career 'lead': ${lead.length} jobs`);
  
  // Deadline
  const deadline = JSON.parse(sql("SELECT * FROM jobs WHERE deadline IS NOT NULL AND deadline != '' AND deadline <= '2026-04-20'"));
  assert(deadline.length === 2, `Deadline <= 2026-04-20: ${deadline.length} jobs`);
  
  // Commute
  const commute = JSON.parse(sql("SELECT * FROM jobs WHERE commute_min IS NULL OR commute_min <= 45"));
  assert(commute.length === 6, `Commute <= 45min: ${commute.length} jobs`);
}

function testSearchWithMatchJoin() {
  console.log('\n🔗 Search + Match Join Tests');
  
  const scored = JSON.parse(sql(`
    SELECT j.*, m.score, m.skill_score, m.location_score
    FROM jobs j
    LEFT JOIN (SELECT job_id, MAX(score) as score, skill_score, location_score FROM matches GROUP BY job_id) m ON j.id = m.job_id
    WHERE m.score >= 80
    ORDER BY m.score DESC
  `));
  assert(scored.length === 2, `Min score 80: ${scored.length} jobs`);
  assert(scored[0].score === 92, `Top score is 92: ${scored[0].score}`);
  assert(scored[0].title === '프론트엔드 개발자', `Top job is 프론트엔드: ${scored[0].title}`);
}

function testSaveMatch() {
  console.log('\n📊 Save Match Tests');
  sqlRun(`INSERT INTO matches (id,job_id,resume_hash,score,skill_score,location_score,report) VALUES ('m5','j1','hash2',75,70,80,'{"test": true}')`);
  const row = JSON.parse(sql("SELECT * FROM matches WHERE id = 'm5'"))[0];
  assert(row.score === 75, 'Match score saved');
  assert(row.skill_score === 70, 'Match skill_score saved');
  
  const maxScore = JSON.parse(sql("SELECT MAX(score) as max FROM matches WHERE job_id = 'j1'"))[0];
  assert(maxScore.max === 92, `MAX score for j1 is 92: ${maxScore.max}`);
}

function testApplications() {
  console.log('\n📝 Application Tests');
  
  const apps = JSON.parse(sql(`
    SELECT a.*, j.title, j.company, j.url, j.work_type, j.salary, j.skills, j.employment_type, j.career_stage
    FROM applications a JOIN jobs j ON a.job_id = j.id ORDER BY a.updated_at DESC
  `));
  assert(apps.length === 8, `Total applications: ${apps.length}`);
  
  // Update status
  const firstApp = apps[0];
  sqlRun(`UPDATE applications SET status = 'applied', memo = '지원완료', updated_at = datetime('now') WHERE id = '${firstApp.id}'`);
  const updated = JSON.parse(sql(`SELECT * FROM applications WHERE id = '${firstApp.id}'`))[0];
  assert(updated.status === 'applied', `Status updated: ${updated.status}`);
  assert(updated.memo === '지원완료', `Memo saved: ${updated.memo}`);
}

function testStats() {
  console.log('\n📈 Stats Tests');
  
  const total = JSON.parse(sql("SELECT COUNT(*) as count FROM jobs"))[0].count;
  assert(total === 8, `Total jobs: ${total}`);
  
  const bySource = JSON.parse(sql("SELECT source, COUNT(*) as count FROM jobs GROUP BY source"));
  assert(bySource.length === 3, `3 sources: ${bySource.length}`);
  
  const salaryCoverage = JSON.parse(sql("SELECT COUNT(*) as count FROM jobs WHERE salary_min IS NOT NULL"))[0].count;
  assert(salaryCoverage === 6, `Jobs with salary: ${salaryCoverage}`);  // test job UPSERT nullifies salary
  
  const skillsCoverage = JSON.parse(sql("SELECT COUNT(*) as count FROM jobs WHERE skills IS NOT NULL AND skills != ''"))[0].count;
  assert(skillsCoverage === 7, `Jobs with skills: ${skillsCoverage}`);  // test job UPSERT clears skills
}

function testCompositeFilters() {
  console.log('\n🎯 Composite Filter Tests');
  
  // 서울 + regular + min_score 80
  const r1 = JSON.parse(sql(`
    SELECT j.*, m.score FROM jobs j
    LEFT JOIN (SELECT job_id, MAX(score) as score FROM matches GROUP BY job_id) m ON j.id = m.job_id
    WHERE j.location LIKE '%서울%' AND j.employment_type = 'regular' AND m.score >= 80
  `));
  assert(r1.length === 2, `서울 + regular + score>=80: ${r1.length}`);  // j1(92) + j3(85)
  assert(r1[0].company === '카카오', `Result is 카카오: ${r1[0].company}`);
  
  // remote + react
  const r2 = JSON.parse(sql("SELECT * FROM jobs WHERE work_type = 'remote' AND skills LIKE '%react%'"));
  assert(r2.length === 1, `Remote + React: ${r2.length}`);
  assert(r2[0].company === 'Toss', `Result is Toss: ${r2[0].company}`);
  
  // salary range
  const r3 = JSON.parse(sql("SELECT * FROM jobs WHERE salary_min >= 5000 AND salary_max <= 10000"));
  assert(r3.length === 3, `Salary 5000-10000: ${r3.length}`);
}

function testEdgeCases() {
  console.log('\n⚠️ Edge Case Tests');
  
  // Minimal job
  const id = crypto.randomUUID();
  sqlRun(`INSERT OR REPLACE INTO jobs (id,source,title,company,url) VALUES ('${id}','wanted','미니멀','미니멀회사','https://min.com/${id}')`);
  const row = JSON.parse(sql(`SELECT * FROM jobs WHERE id = '${id}'`))[0];
  assert(row.title === '미니멀', 'Minimal job insert works');
  assert(row.skills === '', 'Default skills is empty');
  assert(row.employment_type === 'regular', 'Default employment_type is regular');
  
  // URL uniqueness
  let dupeOk = false;
  try { sqlRun(`INSERT INTO jobs (id,source,title,company,url) VALUES ('${crypto.randomUUID()}','w','t','c','https://min.com/${id}')`); } catch { dupeOk = true; }
  assert(dupeOk, 'Duplicate URL rejected');
  
  // FK on matches
  let fkOk = false;
  try { sqlRun("INSERT INTO matches (id,job_id,resume_hash,score) VALUES ('fk1','nonexistent','x',50)"); } catch { fkOk = true; }
  assert(fkOk, 'FK constraint on matches.job_id');
  
  // FK on applications
  let appFkOk = false;
  try { sqlRun("INSERT INTO applications (id,job_id) VALUES ('fk2','nonexistent')"); } catch { appFkOk = true; }
  assert(appFkOk, 'FK constraint on applications.job_id');
}

// ── Run ──

console.log('🧪 MCP Server Database Tests (EXP-134)\n');
setupDB();
testSchema();  // Schema first, before any data
seedData();    // Then seed
testSaveJob();
testSearchFilters();
testSearchWithMatchJoin();
testSaveMatch();
testApplications();
testStats();
testCompositeFilters();
testEdgeCases();

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 MCP Server Tests: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('✅ All MCP server tests passed!');
else console.log('❌ Some tests failed');
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

fs.unlinkSync(TMP_DB);
process.exit(failed > 0 ? 1 : 0);
