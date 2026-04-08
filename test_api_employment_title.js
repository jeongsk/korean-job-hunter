const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePosition } = require('./scripts/scrape-wanted-api');

function makePos(overrides = {}) {
  return {
    id: 1,
    position: '프론트엔드 개발자',
    company: { name: '테스트회사' },
    address: { location: '서울' },
    ...overrides,
  };
}

describe('EXP-170: API employment_type normalization', () => {
  it('정규직 object → regular', () => {
    const r = parsePosition(makePos({ employment_type: { name: '정규직' } }));
    assert.equal(r.employment_type, 'regular');
  });

  it('계약직 object → contract', () => {
    const r = parsePosition(makePos({ employment_type: { name: '계약직' } }));
    assert.equal(r.employment_type, 'contract');
  });

  it('인턴 object → intern', () => {
    const r = parsePosition(makePos({ employment_type: { name: '인턴' } }));
    assert.equal(r.employment_type, 'intern');
  });

  it('프리랜서 object → freelance', () => {
    const r = parsePosition(makePos({ employment_type: { name: '프리랜서' } }));
    assert.equal(r.employment_type, 'freelance');
  });

  it('full_time string → regular', () => {
    const r = parsePosition(makePos({ employment_type: 'full_time' }));
    assert.equal(r.employment_type, 'regular');
  });

  it('null → regular', () => {
    const r = parsePosition(makePos({ employment_type: null }));
    assert.equal(r.employment_type, 'regular');
  });

  it('missing → regular', () => {
    const r = parsePosition(makePos({}));
    assert.equal(r.employment_type, 'regular');
  });

  it('파견 object → contract', () => {
    const r = parsePosition(makePos({ employment_type: { name: '파견' } }));
    assert.equal(r.employment_type, 'contract');
  });
});

describe('EXP-170: API title company bracket strip', () => {
  it('strips [카카오] prefix', () => {
    const r = parsePosition(makePos({ position: '[카카오] 시니어 프론트엔드 개발자', company: { name: '(주)카카오' } }));
    assert.equal(r.title, '시니어 프론트엔드 개발자');
    assert.equal(r.company, '카카오');
  });

  it('strips [토스] prefix with spaces', () => {
    const r = parsePosition(makePos({ position: '[토스]  백엔드 개발자', company: { name: '토스' } }));
    assert.equal(r.title, '백엔드 개발자');
  });

  it('no bracket prefix preserved', () => {
    const r = parsePosition(makePos({ position: '프론트엔드 개발자 (React)' }));
    assert.equal(r.title, '프론트엔드 개발자 (React)');
  });

  it('strips [111퍼센트] prefix', () => {
    const r = parsePosition(makePos({ position: '[111퍼센트] MLOps Engineer', company: { name: '111퍼센트' } }));
    assert.equal(r.title, 'MLOps Engineer');
  });
});
