#!/usr/bin/env node
// test_office_address_extraction.js — EXP-152: Office address extraction from Wanted detail API
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Simulate the detail API response structure
function mockDetailAPI(overrides = {}) {
  return {
    jd: '테스트 JD',
    address: {
      country: '한국',
      full_location: '서울 강남구 테헤란로 123, 5층',
      geo_location: {
        location: { lat: 37.4979, lng: 127.0278 },
        location_type: 'ROOFTOP',
      },
      id: 12345,
      location: '서울',
    },
    ...overrides,
  };
}

// Simulate fetchDetail extraction logic (mirrors scrape-wanted-api.js)
function extractDetail(data) {
  const description = data?.jd || '';
  const fullLocation = data?.address?.full_location || data?.address?.location || '';
  const geoLocation = data?.address?.geo_location?.location || null;
  return {
    description,
    full_location: fullLocation,
    geo_location: geoLocation,
    office_address: data?.address?.full_location || '',
    latitude: data?.address?.geo_location?.location?.lat || null,
    longitude: data?.address?.geo_location?.location?.lng || null,
  };
}

describe('EXP-152: Office address extraction from detail API', () => {
  it('extracts full_location as office_address', () => {
    const detail = extractDetail(mockDetailAPI());
    assert.equal(detail.office_address, '서울 강남구 테헤란로 123, 5층');
  });

  it('extracts lat/lng coordinates', () => {
    const detail = extractDetail(mockDetailAPI());
    assert.equal(detail.latitude, 37.4979);
    assert.equal(detail.longitude, 127.0278);
  });

  it('handles missing address gracefully', () => {
    const detail = extractDetail({ jd: 'test' });
    assert.equal(detail.office_address, '');
    assert.equal(detail.latitude, null);
    assert.equal(detail.longitude, null);
  });

  it('handles missing geo_location gracefully', () => {
    const detail = extractDetail({
      jd: 'test',
      address: { full_location: '서울 강남구', location: '서울' },
    });
    assert.equal(detail.office_address, '서울 강남구');
    assert.equal(detail.latitude, null);
    assert.equal(detail.longitude, null);
  });

  it('handles null address gracefully', () => {
    const detail = extractDetail({ jd: 'test', address: null });
    assert.equal(detail.office_address, '');
    assert.equal(detail.latitude, null);
    assert.equal(detail.longitude, null);
  });

  it('extracts real 구로동 address', () => {
    const detail = extractDetail({
      jd: 'test',
      address: {
        country: '한국',
        full_location: '디지털로31길 12, 8층, 13층, 14층 (구로동, 태평양물산)',
        geo_location: { location: { lat: 37.4864252, lng: 126.892126 } },
        location: '서울',
      },
    });
    assert.equal(detail.office_address, '디지털로31길 12, 8층, 13층, 14층 (구로동, 태평양물산)');
    assert.equal(detail.latitude, 37.4864252);
    assert.equal(detail.longitude, 126.892126);
  });

  it('extracts real 성남시 address', () => {
    const detail = extractDetail({
      jd: 'test',
      address: {
        full_location: '경기 성남시 수정구 창업로40번길 20, A동 42dot',
        geo_location: { location: { lat: 37.4128959, lng: 127.0941394 } },
        location: '경기',
      },
    });
    assert.equal(detail.office_address, '경기 성남시 수정구 창업로40번길 20, A동 42dot');
    assert.equal(detail.latitude, 37.4128959);
  });
});

describe('EXP-152: Enrichment logic', () => {
  it('populates office_address from detail when job has none', () => {
    const job = { office_address: '' };
    const detail = { office_address: '서울 강남구 테헤란로 123' };
    if (detail.office_address && !job.office_address) {
      job.office_address = detail.office_address;
    }
    assert.equal(job.office_address, '서울 강남구 테헤란로 123');
  });

  it('does not overwrite existing office_address', () => {
    const job = { office_address: '서울 서초구 기존주소' };
    const detail = { office_address: '서울 강남구 새주소' };
    if (detail.office_address && !job.office_address) {
      job.office_address = detail.office_address;
    }
    assert.equal(job.office_address, '서울 서초구 기존주소');
  });

  it('populates lat/lng from detail', () => {
    const job = { latitude: null, longitude: null };
    const detail = { latitude: 37.5, longitude: 127.0 };
    if (detail.latitude != null) {
      job.latitude = detail.latitude;
      job.longitude = detail.longitude;
    }
    assert.equal(job.latitude, 37.5);
    assert.equal(job.longitude, 127.0);
  });
});
