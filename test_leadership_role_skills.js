const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inferSkills } = require('./scripts/skill-inference');

describe('EXP-177: Leadership role skill inference', () => {
  it('CTO returns broad tech leadership skills', () => {
    const skills = inferSkills('CTO');
    assert.ok(skills.includes('aws'));
    assert.ok(skills.includes('docker'));
    assert.ok(skills.includes('kubernetes'));
  });

  it('CTO with AI context preserves AI skills from SKILL_MAP', () => {
    const skills = inferSkills('CTO (AI 에이전트 기획 및 개발)');
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('tensorflow'));
    assert.ok(skills.includes('pytorch'));
  });

  it('연구소장 returns research leadership skills', () => {
    const skills = inferSkills('기업부설연구소 연구소장');
    assert.ok(skills.includes('python'));
  });

  it('Engineering Manager returns infra skills', () => {
    const skills = inferSkills('Engineering Manager');
    assert.ok(skills.includes('aws'));
    assert.ok(skills.includes('docker'));
  });

  it('VP Engineering returns broad tech skills', () => {
    const skills = inferSkills('VP Engineering');
    assert.ok(skills.includes('aws'));
    assert.ok(skills.includes('docker'));
  });

  it('Tech Lead returns broad tech skills', () => {
    const skills = inferSkills('Tech Lead');
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('docker'));
  });

  it('기술이사 returns infra skills', () => {
    const skills = inferSkills('기술이사');
    assert.ok(skills.includes('aws'));
  });

  it('개발총괄 returns infra skills', () => {
    const skills = inferSkills('개발총괄');
    assert.ok(skills.includes('aws'));
  });

  it('non-technical director roles return empty', () => {
    const skills = inferSkills('Creative Director');
    assert.deepEqual(skills, []);
  });

  it('프로덕트 매니저 returns empty (non-technical)', () => {
    const skills = inferSkills('프로덕트 매니저 (7년 이상)');
    assert.deepEqual(skills, []);
  });

  it('CTO in mixed title with company name works', () => {
    const skills = inferSkills('글로벌 파트너 사업_CTO(Chief Technology Officer)');
    assert.ok(skills.includes('aws'));
    assert.ok(skills.includes('docker'));
  });

  it('combined CTO/연구소장 gets union of skills', () => {
    const skills = inferSkills('CTO / 연구소장');
    assert.ok(skills.length >= 3);
  });
});
