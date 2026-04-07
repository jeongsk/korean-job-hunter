// EXP-162: Framework-aware role supplement tests
// When a specific framework is detected, role-based supplements should skip conflicting skills.
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { inferSkills } = require('./scripts/skill-inference');

describe('EXP-162: Framework-aware role supplements', () => {
  describe('Frontend framework conflicts (no React added)', () => {
    it('Angular 프론트엔드 → angular+ts+js, NOT react', () => {
      const skills = inferSkills('Angular 프론트엔드');
      assert.ok(skills.includes('angular'));
      assert.ok(skills.includes('typescript'));
      assert.ok(skills.includes('javascript'));
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
    it('Vue 프론트엔드 → vue+ts+js, NOT react', () => {
      const skills = inferSkills('Vue 프론트엔드');
      assert.ok(skills.includes('vue'));
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
    it('Nuxt 프론트엔드 → nuxt+ts+js, NOT react', () => {
      const skills = inferSkills('Nuxt 프론트엔드');
      assert.ok(skills.includes('nuxt'));
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
    it('Svelte 프론트엔드 → svelte+ts+js, NOT react', () => {
      const skills = inferSkills('Svelte 프론트엔드');
      assert.ok(skills.includes('svelte'));
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
    it('React 프론트엔드 → react+ts+js (no conflict)', () => {
      const skills = inferSkills('React 프론트엔드');
      assert.ok(skills.includes('react'));
      assert.ok(skills.includes('typescript'));
    });
    it('프론트엔드 → react+ts+js (no framework detected)', () => {
      const skills = inferSkills('프론트엔드 개발자');
      assert.ok(skills.includes('react'));
      assert.ok(skills.includes('typescript'));
      assert.ok(skills.includes('javascript'));
    });
  });

  describe('Mobile framework conflicts', () => {
    it('Flutter 모바일 → flutter only, NOT react native', () => {
      const skills = inferSkills('Flutter 모바일');
      assert.ok(skills.includes('flutter'));
      assert.ok(!skills.includes('react native'), 'should NOT have react native');
    });
    it('React Native 모바일 → react native+react', () => {
      const skills = inferSkills('React Native 모바일');
      assert.ok(skills.includes('react native'));
      assert.ok(skills.includes('react'));
    });
  });

  describe('Backend language conflicts', () => {
    it('Go 백엔드 → go only, NOT node.js/python/java', () => {
      const skills = inferSkills('Go 백엔드');
      assert.ok(skills.includes('go'));
      assert.ok(!skills.includes('node.js'), 'should NOT have node.js');
      assert.ok(!skills.includes('python'), 'should NOT have python');
      assert.ok(!skills.includes('java'), 'should NOT have java');
    });
    it('Rust 백엔드 → rust only, NOT node.js/python/java', () => {
      const skills = inferSkills('Rust 백엔드');
      assert.ok(skills.includes('rust'));
      assert.ok(!skills.includes('node.js'), 'should NOT have node.js');
    });
    it('C# 백엔드 → c# only, NOT node.js/python/java', () => {
      const skills = inferSkills('C# 백엔드');
      assert.ok(skills.includes('c#'));
      assert.ok(!skills.includes('node.js'), 'should NOT have node.js');
    });
    it('Java 백엔드 → java+node.js+python (Java is not a conflict trigger)', () => {
      const skills = inferSkills('Java 백엔드');
      assert.ok(skills.includes('java'));
      // Java IS a backend default, so no conflict — role supplement adds other backend skills
      assert.ok(skills.includes('node.js'));
      assert.ok(skills.includes('python'));
    });
    it('백엔드 → node.js+python+java (no language conflict)', () => {
      const skills = inferSkills('백엔드 개발자');
      assert.ok(skills.includes('node.js'));
      assert.ok(skills.includes('python'));
      assert.ok(skills.includes('java'));
    });
  });

  describe('Edge cases', () => {
    it('Angular 개발자 → angular+ts+js, NOT react', () => {
      const skills = inferSkills('Angular 개발자');
      assert.ok(skills.includes('angular'));
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
    it('Golang backend engineer → go only', () => {
      const skills = inferSkills('Golang backend engineer');
      assert.ok(skills.includes('go'));
      assert.ok(!skills.includes('node.js'), 'should NOT have node.js');
    });
    it('Angular 풀스택 → angular+typescript+javascript+node.js, NOT react', () => {
      const skills = inferSkills('Angular 풀스택');
      assert.ok(skills.includes('angular'));
      assert.ok(skills.includes('node.js'));  // 풀스택 adds node.js
      assert.ok(!skills.includes('react'), 'should NOT have react');
    });
  });
});
