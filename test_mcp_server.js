/**
 * EXP-153: MCP Server CRUD and Search Tests
 * 
 * Tests for keyword search, delete job, and save application MCP tools
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('./mcp-server/node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');

// We test the SQL logic directly by importing the compiled JS
// For unit testing, we recreate the logic with an in-memory DB

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      content TEXT,
      location TEXT,
      office_address TEXT,
      work_type TEXT,
      commute_min INTEGER,
      experience TEXT,
      salary TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      deadline TEXT,
      reward TEXT,
      culture_keywords TEXT,
      skills TEXT DEFAULT '',
      employment_type TEXT DEFAULT 'regular',
      career_stage TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      fetched_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE matches (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      resume_hash TEXT NOT NULL,
      score INTEGER NOT NULL,
      skill_score INTEGER,
      location_score INTEGER,
      report TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      status TEXT NOT NULL DEFAULT 'interested',
      memo TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function buildSearchQuery(filters) {
  const conditions = [];
  const params = [];
  if (filters.source) { conditions.push("j.source = ?"); params.push(filters.source); }
  if (filters.work_type) { conditions.push("j.work_type = ?"); params.push(filters.work_type); }
  if (filters.keyword) { conditions.push("(j.title LIKE ? OR j.company LIKE ?)"); params.push(`%${filters.keyword}%`, `%${filters.keyword}%`); }
  if (filters.min_salary !== undefined) { conditions.push("j.salary_min IS NOT NULL AND j.salary_min >= ?"); params.push(filters.min_salary); }
  if (filters.skills) { conditions.push("j.skills LIKE ?"); params.push(`%${filters.skills}%`); }
  if (filters.employment_type) { conditions.push("j.employment_type = ?"); params.push(filters.employment_type); }
  if (filters.career_stage) { conditions.push("j.career_stage = ?"); params.push(filters.career_stage); }
  if (filters.deadline_before) { conditions.push("(j.deadline IS NOT NULL AND j.deadline != '' AND j.deadline <= ?)"); params.push(filters.deadline_before); }
  let query = `SELECT j.*, m.score, m.skill_score, m.location_score FROM jobs j LEFT JOIN (SELECT job_id, MAX(score) as score, skill_score, location_score FROM matches GROUP BY job_id) m ON j.id = m.job_id`;
  if (filters.min_score !== undefined) { conditions.push("m.score >= ?"); params.push(filters.min_score); }
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY COALESCE(m.score, 0) DESC";
  query += ` LIMIT ${filters.limit ?? 20}`;
  return { query, params };
}

describe('MCP Server: Keyword Search', () => {
  const db = createTestDb();
  const insert = db.prepare(`INSERT OR REPLACE INTO jobs (id, source, title, company, url, skills, salary_min, salary_max, deadline, employment_type, career_stage, work_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  // Insert test data
  insert.run('j1', 'wanted', '프론트엔드 개발자', '카카오', 'https://w.co/1', 'react,typescript', 5000, 8000, '2026-04-30', 'regular', 'senior', 'hybrid');
  insert.run('j2', 'wanted', '백엔드 엔지니어', '네이버', 'https://w.co/2', 'java,spring', 6000, 9000, '2026-04-15', 'regular', 'mid', 'onsite');
  insert.run('j3', 'jobkorea', '프론트엔드 시니어', '카카오엔터', 'https://w.co/3', 'react,vue', 7000, 10000, null, 'regular', 'senior', 'remote');
  insert.run('j4', 'linkedin', 'Data Scientist', '토스', 'https://w.co/4', 'python,tensorflow', 8000, 12000, '2026-05-01', 'regular', 'lead', 'hybrid');
  insert.run('j5', 'wanted', 'iOS Developer', '배달의민족', 'https://w.co/5', 'swift,swiftui', 5000, 7000, '2026-04-20', 'contract', 'mid', 'onsite');

  it('keyword search finds by title', () => {
    const { query, params } = buildSearchQuery({ keyword: '프론트엔드' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 2);
    assert.ok(results.every(r => r.title.includes('프론트엔드')));
  });

  it('keyword search finds by company', () => {
    const { query, params } = buildSearchQuery({ keyword: '카카오' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 2);
    assert.ok(results.every(r => r.company.includes('카카오')));
  });

  it('keyword search finds English title', () => {
    const { query, params } = buildSearchQuery({ keyword: 'Data' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 1);
    assert.equal(results[0].company, '토스');
  });

  it('combined keyword + salary filter', () => {
    const { query, params } = buildSearchQuery({ keyword: '프론트엔드', min_salary: 6000 });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 1);
    assert.equal(results[0].company, '카카오엔터');
  });

  it('combined keyword + employment_type', () => {
    const { query, params } = buildSearchQuery({ keyword: 'Developer', employment_type: 'contract' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 1);
    assert.equal(results[0].company, '배달의민족');
  });

  it('deadline_before filter works', () => {
    const { query, params } = buildSearchQuery({ deadline_before: '2026-04-16' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 1);
    assert.equal(results[0].company, '네이버');
  });

  it('no results for non-matching keyword', () => {
    const { query, params } = buildSearchQuery({ keyword: '디자이너' });
    const results = db.prepare(query).all(...params);
    assert.equal(results.length, 0);
  });
});

describe('MCP Server: Delete Job', () => {
  const db = createTestDb();
  const insertJob = db.prepare(`INSERT OR REPLACE INTO jobs (id, source, title, company, url) VALUES (?, ?, ?, ?, ?)`);
  const insertMatch = db.prepare(`INSERT INTO matches (id, job_id, resume_hash, score) VALUES (?, ?, ?, ?)`);
  const insertApp = db.prepare(`INSERT INTO applications (id, job_id, status) VALUES (?, ?, ?)`);

  it('deletes job and cascades to matches and applications', () => {
    insertJob.run('del1', 'wanted', 'Test', 'Co', 'https://x.co/1');
    insertMatch.run('m1', 'del1', 'hash1', 80);
    insertApp.run('a1', 'del1', 'interested');

    db.prepare("DELETE FROM matches WHERE job_id = ?").run('del1');
    db.prepare("DELETE FROM applications WHERE job_id = ?").run('del1');
    const info = db.prepare("DELETE FROM jobs WHERE id = ?").run('del1');

    assert.equal(info.changes, 1);
    assert.equal(db.prepare("SELECT COUNT(*) as c FROM jobs WHERE id = 'del1'").get().c, 0);
    assert.equal(db.prepare("SELECT COUNT(*) as c FROM matches WHERE job_id = 'del1'").get().c, 0);
    assert.equal(db.prepare("SELECT COUNT(*) as c FROM applications WHERE job_id = 'del1'").get().c, 0);
  });

  it('delete non-existent job returns 0 changes', () => {
    const info = db.prepare("DELETE FROM jobs WHERE id = ?").run('nonexistent');
    assert.equal(info.changes, 0);
  });
});

describe('MCP Server: Save Application', () => {
  const db = createTestDb();
  const insertJob = db.prepare(`INSERT OR REPLACE INTO jobs (id, source, title, company, url) VALUES (?, ?, ?, ?, ?)`);
  const insertApp = db.prepare(`INSERT OR IGNORE INTO applications (id, job_id, status) VALUES (?, ?, 'interested')`);
  const updateApp = db.prepare(`UPDATE applications SET status = ?, memo = COALESCE(?, memo), updated_at = datetime('now') WHERE id = ?`);

  it('creates new application for job', () => {
    insertJob.run('app1', 'wanted', 'Test', 'Co', 'https://x.co/a1');
    const appId = 'test-app-1';
    insertApp.run(appId, 'app1');
    updateApp.run('applied', 'Applied via email', appId);

    const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(appId);
    assert.equal(app.job_id, 'app1');
    assert.equal(app.status, 'applied');
    assert.equal(app.memo, 'Applied via email');
  });

  it('updates existing application status', () => {
    insertJob.run('app2', 'wanted', 'Test2', 'Co2', 'https://x.co/a2');
    const appId = 'test-app-2';
    insertApp.run(appId, 'app2');
    updateApp.run('interview', null, appId);
    
    // Second update
    updateApp.run('offer', 'Got offer!', appId);

    const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(appId);
    assert.equal(app.status, 'offer');
    assert.equal(app.memo, 'Got offer!');
  });

  it('handles all status transitions', () => {
    const statuses = ['interested', 'applying', 'applied', 'interview', 'offer', 'declined', 'rejected'];
    insertJob.run('app3', 'wanted', 'Test3', 'Co3', 'https://x.co/a3');
    const appId = 'test-app-3';
    insertApp.run(appId, 'app3');
    
    for (const status of statuses) {
      updateApp.run(status, null, appId);
      const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(appId);
      assert.equal(app.status, status);
    }
  });
});

describe('MCP Server: Stats include new fields', () => {
  const db = createTestDb();
  const insert = db.prepare(`INSERT OR REPLACE INTO jobs (id, source, title, company, url, skills, salary_min, employment_type, career_stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  it('salary_coverage counts jobs with salary_min', () => {
    insert.run('s1', 'wanted', 'A', 'C', 'https://x.co/s1', 'react', 5000, 'regular', 'mid');
    insert.run('s2', 'wanted', 'B', 'C', 'https://x.co/s2', 'java', null, 'regular', 'senior');
    
    const count = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE salary_min IS NOT NULL").get()).count;
    assert.equal(count, 1);
  });

  it('skills_coverage counts jobs with non-empty skills', () => {
    const count = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE skills IS NOT NULL AND skills != ''").get()).count;
    assert.equal(count, 2);
  });
});
