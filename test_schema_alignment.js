// EXP-058: Test matches table schema alignment with matcher v4.2
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'jobs.db');
let passed = 0, failed = 0;

const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(matches)", (err, rows) => {
  if (err) { console.log('❌ Cannot read schema:', err.message); process.exit(1); }
  
  const cols = rows.map(r => r.name);
  
  // Test 1: Required scoring columns exist
  const required = ['overall_score', 'skill_score', 'experience_score', 'culture_score', 'career_score', 'location_score'];
  for (const col of required) {
    if (cols.includes(col)) {
      console.log(`✅ Column '${col}' exists`);
      passed++;
    } else {
      console.log(`❌ Column '${col}' MISSING`);
      failed++;
    }
  }
  
  // Test 2: Old stale columns still present (legacy, not harmful)
  const legacy = ['preferred_score', 'work_type_score', 'commute_score'];
  const hasLegacy = legacy.filter(c => cols.includes(c));
  if (hasLegacy.length > 0) {
    console.log(`⚠️  Legacy columns present (unused): ${hasLegacy.join(', ')}`);
  } else {
    console.log('✅ No stale legacy columns');
    passed++;
  }
  
  // Test 3: job_id foreign key
  const jobIdCol = rows.find(r => r.name === 'job_id');
  if (jobIdCol && jobIdCol.notnull) {
    console.log('✅ job_id is NOT NULL');
    passed++;
  } else {
    console.log('❌ job_id should be NOT NULL');
    failed++;
  }
  
  // Test 4: match_details for JSON breakdown
  if (cols.includes('match_details')) {
    console.log('✅ match_details column exists (JSON breakdown)');
    passed++;
  } else {
    console.log('❌ match_details column missing');
    failed++;
  }
  
  // Test 5: resume_id for multi-resume support
  if (cols.includes('resume_id')) {
    console.log('✅ resume_id column exists (multi-resume support)');
    passed++;
  } else {
    console.log('❌ resume_id column missing');
    failed++;
  }
  
  console.log('─'.repeat(40));
  console.log(`📊 Schema alignment: ${passed}/${passed + failed} passed`);
  
  db.close();
  
  if (failed > 0) process.exit(1);
});
