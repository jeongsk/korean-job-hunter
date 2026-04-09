const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { deriveCareerStage } = require('./scripts/skill-inference');

describe('EXP-174: N년차 career stage', () => {
  it('1년차 → junior', () => assert.equal(deriveCareerStage('1년차'), 'junior'));
  it('3년차 → junior', () => assert.equal(deriveCareerStage('3년차'), 'junior'));
  it('4년차 → mid', () => assert.equal(deriveCareerStage('4년차'), 'mid'));
  it('5년차 → mid', () => assert.equal(deriveCareerStage('5년차'), 'mid'));
  it('6년차 → mid', () => assert.equal(deriveCareerStage('6년차'), 'mid'));
  it('7년차 → mid', () => assert.equal(deriveCareerStage('7년차'), 'mid'));
  it('8년차 → senior', () => assert.equal(deriveCareerStage('8년차'), 'senior'));
  it('10년차 → senior', () => assert.equal(deriveCareerStage('10년차'), 'senior'));
  it('12년차 → senior', () => assert.equal(deriveCareerStage('12년차'), 'senior'));
  it('13년차 → lead', () => assert.equal(deriveCareerStage('13년차'), 'lead'));
  it('15년차 → lead', () => assert.equal(deriveCareerStage('15년차'), 'lead'));
  it('0년차 → junior', () => assert.equal(deriveCareerStage('0년차'), 'junior'));
  it('20년차 → lead', () => assert.equal(deriveCareerStage('20년차'), 'lead'));
  
  // With spaces
  it('5 년차 → mid', () => assert.equal(deriveCareerStage('5 년차'), 'mid'));
  it('10 년차 → senior', () => assert.equal(deriveCareerStage('10 년차'), 'senior'));
  
  // Regression: existing patterns still work
  it('3년 → junior (regression)', () => assert.equal(deriveCareerStage('3년'), 'junior'));
  it('3년 이상 → mid (regression)', () => assert.equal(deriveCareerStage('3년 이상'), 'mid'));
  it('경력 → mid (regression)', () => assert.equal(deriveCareerStage('경력'), 'mid'));
  it('신입 → entry (regression)', () => assert.equal(deriveCareerStage('신입'), 'entry'));
  it('3~7년 → mid (regression)', () => assert.equal(deriveCareerStage('3~7년'), 'mid'));
});
