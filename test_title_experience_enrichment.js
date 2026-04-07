#!/usr/bin/env node
/**
 * EXP-156: Title-based experience enrichment for API-scraped jobs.
 * Tests that parsePosition enriches the experience field from title-embedded
 * year ranges, rather than leaving it as generic "경력".
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// We test the regex logic directly since parsePosition is inline in scrape-wanted-api.js
function enrichExperienceFromTitle(title, isNewbie) {
  let experience = isNewbie ? '신입가능' : '경력';
  const titleYears = title.match(/(\d+)\s*년\s*이상/) ||
                     title.match(/(\d+)\s*[-~]\s*(\d+)\s*년(?![가-힣])/);
  if (titleYears) {
    if (titleYears[2]) {
      experience = `${titleYears[1]}~${titleYears[2]}년`;
    } else {
      experience = `${titleYears[1]}년 이상`;
    }
  }
  const newbieTitleRange = title.match(/(?:신입|0)\s*[-~]\s*(\d+)\s*년(?![가-힣])/);
  if (newbieTitleRange) {
    experience = `신입~${newbieTitleRange[1]}년`;
  }
  return experience;
}

describe('EXP-156: Title experience enrichment', () => {
  it('백엔드 개발자 (3년 이상) → 3년 이상', () => {
    assert.equal(enrichExperienceFromTitle('백엔드 개발자 (3년 이상)', false), '3년 이상');
  });

  it('프론트엔드 개발자 (5년 이상) → 5년 이상', () => {
    assert.equal(enrichExperienceFromTitle('프론트엔드 개발자 (5년 이상)', false), '5년 이상');
  });

  it('개발자(3~7년) → 3~7년', () => {
    assert.equal(enrichExperienceFromTitle('개발자(3~7년)', false), '3~7년');
  });

  it('개발자(3-7년) → 3~7년', () => {
    assert.equal(enrichExperienceFromTitle('개발자(3-7년)', false), '3~7년');
  });

  it('프론트엔드 개발자(신입-5년) → 신입~5년', () => {
    assert.equal(enrichExperienceFromTitle('프론트엔드 개발자(신입-5년)', false), '신입~5년');
  });

  it('개발자(신입~10년) → 신입~10년', () => {
    assert.equal(enrichExperienceFromTitle('개발자(신입~10년)', false), '신입~10년');
  });

  it('개발자(0-3년) → 신입~3년', () => {
    assert.equal(enrichExperienceFromTitle('개발자(0-3년)', false), '신입~3년');
  });

  it('plain title without years → 경력', () => {
    assert.equal(enrichExperienceFromTitle('Backend Engineer (Java/Kotlin)', false), '경력');
  });

  it('Sr. Backend Engineer → 경력 (no year info in title)', () => {
    assert.equal(enrichExperienceFromTitle('Sr. Backend Engineer (Go/Java)', false), '경력');
  });

  it('신입 title with isNewbie=true → 신입가능', () => {
    assert.equal(enrichExperienceFromTitle('백엔드 개발자 (신입)', true), '신입가능');
  });

  it('plain title with isNewbie=false → 경력', () => {
    assert.equal(enrichExperienceFromTitle('[미리캔버스] 시니어 프론트엔드 개발자', false), '경력');
  });

  it('title with 10년 이상 → 10년 이상', () => {
    assert.equal(enrichExperienceFromTitle('시니어 개발자 (10년 이상)', false), '10년 이상');
  });

  it('does not match calendar year 도 suffix', () => {
    // "21년도" should not be matched
    assert.equal(enrichExperienceFromTitle('회사 (21년도 설립)', false), '경력');
  });

  it('complex title: [리텐틱스] 백엔드 개발자 (3년 이상)', () => {
    assert.equal(enrichExperienceFromTitle('[리텐틱스] 백엔드 개발자 (3년 이상)', false), '3년 이상');
  });
});
