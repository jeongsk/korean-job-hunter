/**
 * EXP-165: Hybrid work type detection test
 * 
 * Tests that partial/alternating remote patterns are correctly classified
 * as 'hybrid' instead of 'remote'.
 * 
 * Before fix: 격주 재택근무, 주 2일 재택, 선택적 재택 all classified as 'remote'
 * After fix:  These patterns correctly return 'hybrid'
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Import actual detectWorkType from all sources
const { detectWorkType: detectWorkTypeLinkedIn } = require('./scripts/post-process-linkedin');
const { detectWorkType: detectWorkTypeAPI } = require('./scripts/scrape-wanted-api');

// For Wanted post-processor and JobKorea, functions aren't exported, so test inline with the same regex
// These must stay in sync with the source files.
const HYBRID_PATTERN = /격주\s*재택|격일\s*재택|선택적?\s*재택|부분\s*재택|주\s*\d\s*일\s*(출근|재택)|하이브리드|주\d일\s*출근|hybrid/i;
const REMOTE_PATTERN = /전면재택|재택근무|풀리모트|원격근무|fully?\s*remote|100%\s*remote/i;
const GENERIC_REMOTE = /재택|remote|리모트|원격/i;

function detectWorkTypeWanted(text) {
  if (HYBRID_PATTERN.test(text)) return 'hybrid';
  if (REMOTE_PATTERN.test(text)) return 'remote';
  if (GENERIC_REMOTE.test(text)) return 'remote';
  return 'onsite';
}

function detectWorkTypeJobKorea(text) {
  if (HYBRID_PATTERN.test(text)) return 'hybrid';
  if (REMOTE_PATTERN.test(text)) return 'remote';
  if (GENERIC_REMOTE.test(text)) return 'remote';
  return 'onsite';
}

const allDetectors = [
  { name: 'API', fn: detectWorkTypeAPI },
  { name: 'Wanted', fn: detectWorkTypeWanted },
  { name: 'LinkedIn', fn: detectWorkTypeLinkedIn },
  { name: 'JobKorea', fn: detectWorkTypeJobKorea },
];

describe('EXP-165: Hybrid work type detection', () => {
  // === HYBRID patterns (should return 'hybrid') ===
  
  for (const { name, fn } of allDetectors) {
    describe(`${name} detector`, () => {
      // Alternating remote patterns
      it('격주 재택근무 → hybrid', () => assert.equal(fn('격주 재택근무day'), 'hybrid'));
      it('격주재택 → hybrid', () => assert.equal(fn('격주재택 가능'), 'hybrid'));
      it('격일 재택 → hybrid', () => assert.equal(fn('격일 재택 근무'), 'hybrid'));
      
      // Partial remote patterns
      it('부분 재택 → hybrid', () => assert.equal(fn('부분 재택근무'), 'hybrid'));
      it('선택적 재택 → hybrid', () => assert.equal(fn('선택적 재택근무'), 'hybrid'));
      it('선택 재택 → hybrid', () => assert.equal(fn('선택 재택 가능'), 'hybrid'));
      
      // Weekly N-day remote patterns
      it('주 2일 재택 → hybrid', () => assert.equal(fn('주 2일 재택근무'), 'hybrid'));
      it('주3일 출근 → hybrid', () => assert.equal(fn('주3일 출근'), 'hybrid'));
      it('주 2일 출근 → hybrid', () => assert.equal(fn('주 2일 출근 가능'), 'hybrid'));
      
      // Existing hybrid patterns (regression check)
      it('하이브리드 → hybrid', () => assert.equal(fn('하이브리드 근무'), 'hybrid'));
      it('hybrid → hybrid', () => assert.equal(fn('hybrid work environment'), 'hybrid'));
      
      // === REMOTE patterns (should return 'remote') ===
      it('전면재택 → remote', () => assert.equal(fn('전면재택 근무'), 'remote'));
      it('재택근무 → remote', () => assert.equal(fn('재택근무 가능'), 'remote'));
      it('풀리모트 → remote', () => assert.equal(fn('풀리모트'), 'remote'));
      it('원격근무 → remote', () => assert.equal(fn('원격근무'), 'remote'));
      it('full remote → remote', () => assert.equal(fn('full remote position'), 'remote'));
      it('재택 → remote (generic)', () => assert.equal(fn('재택 가능합니다'), 'remote'));
      it('remote → remote', () => assert.equal(fn('remote work'), 'remote'));
      it('리모트 → remote', () => assert.equal(fn('리모트 근무'), 'remote'));
      it('원격 → remote', () => assert.equal(fn('원격 근무'), 'remote'));
      
      // === ONSITE patterns (should return 'onsite') ===
      it('no keyword → onsite', () => assert.equal(fn('서울 강남구 출근'), 'onsite'));
      it('empty → null/onsite', () => {
        const result = fn('');
        assert.ok(result === null || result === 'onsite');
      });
    });
  }
  
  // === Live data patterns from Wanted JD descriptions ===
  describe('Live JD patterns', () => {
    it('격주 재택근무day → hybrid (live Wanted)', () => {
      assert.equal(detectWorkTypeAPI('원하는 곳에서 일하는 격주 재택근무day'), 'hybrid');
    });
    
    it('유연근무제 only → onsite (not remote/hybrid)', () => {
      assert.equal(detectWorkTypeAPI('오전 8~10시 자율적으로 출근, 17~19시 퇴근 유연근무제 운영'), 'onsite');
    });
    
    it('시차 출퇴근제 only → onsite', () => {
      assert.equal(detectWorkTypeAPI('시차 출퇴근제 운영 및 정시 퇴근 장려'), 'onsite');
    });
  });
  
  // === Edge cases ===
  describe('Edge cases', () => {
    it('전면재택 + 격주 in same text → remote (full remote wins)', () => {
      // If both patterns appear, full remote should win (checked first)
      assert.equal(detectWorkTypeAPI('전면재택이지만 격주로 사무실 출근'), 'remote');
    });
    
    it('격주재택 without space → hybrid', () => {
      assert.equal(detectWorkTypeAPI('격주재택'), 'hybrid');
    });
  });
});
