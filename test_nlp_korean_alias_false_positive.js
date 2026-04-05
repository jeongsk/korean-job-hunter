/**
 * EXP-136: Korean alias false positive fix
 * Tests that Korean skill aliases (뷰→vue, 다트→dart) don't match as substrings
 * of longer Korean words, and that 삼성 doesn't produce redundant company+location filters.
 */

const { parseKoreanQuery } = require('./scripts/nlp-parser');
const { inferSkills } = require('./scripts/skill-inference');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('NLP Korean alias false positive fix', () => {
  // === Bug 1: 뷰 false positive ===
  it('뷰티샵 should NOT match vue skill', () => {
    const r = parseKoreanQuery('뷰티샵 공고');
    assert.ok(!JSON.stringify(r.filters).includes("vue"), '뷰티샵 should not match vue');
  });

  it('뷰포트 should NOT match vue skill', () => {
    const r = parseKoreanQuery('뷰포트 관련 공고');
    assert.ok(!JSON.stringify(r.filters).includes("vue"), '뷰포트 should not match vue');
  });

  it('standalone 뷰 should match vue skill', () => {
    const r = parseKoreanQuery('뷰 공고');
    assert.ok(JSON.stringify(r.filters).includes("vue"), 'standalone 뷰 should match vue');
  });

  it('vue (English) should match vue skill', () => {
    const r = parseKoreanQuery('vue 공고');
    assert.ok(JSON.stringify(r.filters).includes("vue"), 'vue should match vue skill');
  });

  // === Bug 2: 다트 false positive ===
  it('다트게임 should NOT match dart skill', () => {
    const r = parseKoreanQuery('다트게임 공고');
    assert.ok(!JSON.stringify(r.filters).includes("dart"), '다트게임 should not match dart');
  });

  it('standalone 다트 should match dart skill', () => {
    const r = parseKoreanQuery('다트 공고');
    assert.ok(JSON.stringify(r.filters).includes("dart"), 'standalone 다트 should match dart');
  });

  // === Bug 3: 삼성 double filter ===
  it('삼성 should only appear once in filters (company OR location, not both)', () => {
    const r = parseKoreanQuery('삼성 공고');
    const str = JSON.stringify(r.filters);
    const count = (str.match(/삼성/g) || []).length;
    assert.equal(count, 1, '삼성 should appear only once in filters');
  });

  it('삼성 should match as company', () => {
    const r = parseKoreanQuery('삼성 공고');
    assert.ok(r.filters.some(f => f.includes("company LIKE '%삼성%'")), '삼성 should match as company');
  });
});

describe('Skill inference Korean alias false positive fix', () => {
  it('뷰티샵 개발자 should NOT extract vue', () => {
    const skills = inferSkills('뷰티샵 개발자');
    assert.ok(!skills.includes('vue'), '뷰티샵 should not extract vue');
  });

  it('다트게임 개발자 should NOT extract dart', () => {
    const skills = inferSkills('다트게임 개발자');
    assert.ok(!skills.includes('dart'), '다트게임 should not extract dart');
  });

  it('Vue 개발자 should extract vue', () => {
    const skills = inferSkills('Vue 개발자');
    assert.ok(skills.includes('vue'), 'Vue should extract vue');
  });

  it('뷰 프레임워크 should extract vue', () => {
    const skills = inferSkills('뷰 프레임워크');
    assert.ok(skills.includes('vue'), '뷰 followed by space should extract vue');
  });

  it('다트 언어 should extract dart', () => {
    const skills = inferSkills('다트 언어');
    assert.ok(skills.includes('dart'), '다트 followed by space should extract dart');
  });
});
