/**
 * EXP-142: Role-Skill Map False Positive from JD Description Text
 *
 * Tests that ROLE_SKILL_MAP only fires for title text, not full JD descriptions.
 * Company descriptions mentioning "AI", "클라우드" etc. should NOT trigger
 * role-based skill inference (python, tensorflow, pytorch, aws, etc.)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inferSkills } = require('./scripts/skill-inference');

describe('EXP-142: Role map false positive fix', () => {

  // --- Core fix: includeRoleMap option ---

  it('title with AI role gets role-based skills (default behavior)', () => {
    const skills = inferSkills('인공지능 엔지니어');
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('tensorflow'));
    assert.ok(skills.includes('pytorch'));
  });

  it('title with AI role gets role-based skills (explicit includeRoleMap=true)', () => {
    const skills = inferSkills('인공지능 엔지니어', { includeRoleMap: true });
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('tensorflow'));
  });

  it('description with AI mention does NOT get role-based skills when includeRoleMap=false', () => {
    const skills = inferSkills('AI 분석 & 코칭 서비스를 제공합니다', { includeRoleMap: false });
    assert.ok(!skills.includes('python'), 'should not include python from AI role map');
    assert.ok(!skills.includes('tensorflow'), 'should not include tensorflow from AI role map');
    assert.ok(!skills.includes('pytorch'), 'should not include pytorch from AI role map');
  });

  it('description with 클라우드 does NOT get role-based skills when includeRoleMap=false', () => {
    const skills = inferSkills('클라우드 서비스 기업입니다', { includeRoleMap: false });
    assert.ok(!skills.includes('aws'), 'should not include aws from cloud role map');
    assert.ok(!skills.includes('docker'), 'should not include docker from cloud role map');
    assert.ok(!skills.includes('kubernetes'), 'should not include kubernetes from cloud role map');
  });

  it('description with 데브옵스 does NOT get role-based skills when includeRoleMap=false', () => {
    const skills = inferSkills('데브옵스 팀과 협업합니다', { includeRoleMap: false });
    assert.ok(!skills.includes('docker'), 'should not include docker from devops role map');
    assert.ok(!skills.includes('kubernetes'), 'should not include kubernetes from devops role map');
  });

  // --- Real-world JD scenarios ---

  it('프론트엔드 job with "AI 분석" in company desc: no ML skills from description', () => {
    const title = '프론트엔드 개발자';
    const desc = '인아웃은 개인 건강 기록, AI 분석 & 코칭, 소셜 네트워킹 서비스입니다. Typescript, React, Nextjs 환경에서 개발합니다.';
    const titleSkills = inferSkills(title);
    const descSkills = inferSkills(desc, { includeRoleMap: false });
    const combined = [...new Set([...titleSkills, ...descSkills])];

    // Title role map should give react/typescript/javascript
    assert.ok(titleSkills.includes('react'));
    assert.ok(titleSkills.includes('typescript'));

    // Description SKILL_MAP should give typescript/react/next.js
    assert.ok(descSkills.includes('typescript'));
    assert.ok(descSkills.includes('next.js'));

    // Description should NOT add python/tensorflow/pytorch from "AI 분석"
    assert.ok(!descSkills.includes('python'), 'no python from AI mention in desc');
    assert.ok(!descSkills.includes('tensorflow'), 'no tensorflow from AI mention in desc');
    assert.ok(!descSkills.includes('pytorch'), 'no pytorch from AI mention in desc');

    // Combined should be clean
    assert.ok(!combined.includes('python'));
    assert.ok(!combined.includes('tensorflow'));
    assert.ok(!combined.includes('pytorch'));
  });

  it('백엔드 job with "클라우드 인프라" in company desc: no aws/k8s from description', () => {
    const title = '백엔드 개발자';
    const desc = '클라우드 인프라 기반의 스타트업입니다. Spring Boot, MySQL 사용합니다.';
    const titleSkills = inferSkills(title);
    const descSkills = inferSkills(desc, { includeRoleMap: false });
    const combined = [...new Set([...titleSkills, ...descSkills])];

    // Should get spring boot, mysql from SKILL_MAP
    assert.ok(combined.includes('spring boot'));
    assert.ok(combined.includes('mysql'));

    // Should NOT get aws/docker/kubernetes from "클라우드" in desc
    assert.ok(!descSkills.includes('aws'));
    assert.ok(!descSkills.includes('docker'));
    assert.ok(!descSkills.includes('kubernetes'));
  });

  it('디자인 job title gives figma via role map', () => {
    const skills = inferSkills('디자인 직무');
    assert.ok(skills.includes('figma'));
  });

  it('"디자인" in description does NOT give figma when includeRoleMap=false', () => {
    const skills = inferSkills('디자인 시스템을 사용합니다', { includeRoleMap: false });
    assert.ok(!skills.includes('figma'));
  });

  // --- Backward compatibility ---

  it('default (no options) includes role map for backward compat', () => {
    const skills = inferSkills('인공지능 엔지니어');
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('tensorflow'));
    assert.ok(skills.includes('pytorch'));
  });

  it('SKILL_MAP still works when includeRoleMap=false', () => {
    const skills = inferSkills('React, Python, Docker, Kubernetes 경험', { includeRoleMap: false });
    assert.ok(skills.includes('react'));
    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('docker'));
    assert.ok(skills.includes('kubernetes'));
  });

  // --- Edge cases ---

  it('empty/null text returns empty array', () => {
    assert.deepStrictEqual(inferSkills(''), []);
    assert.deepStrictEqual(inferSkills(null), []);
    assert.deepStrictEqual(inferSkills(undefined), []);
  });

  it('title with cloud keyword in Korean still works with role map', () => {
    const skills = inferSkills('클라우드 엔지니어');
    assert.ok(skills.includes('aws'));
    assert.ok(skills.includes('docker'));
  });
});
