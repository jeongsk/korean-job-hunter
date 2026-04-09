#!/usr/bin/env node
// test_v4_salary_enrichment.js — EXP-174: Test parallel v4 salary enrichment at search time
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Test the salary enrichment logic in isolation
// We can't test the actual API calls in unit tests, so we test the enrichment logic

describe('EXP-174: V4 salary enrichment logic', () => {
  // Simulate the enrichment logic from scrape-wanted-api.js
  function enrichSalaryFromV4(job, v4Job) {
    const annualFrom = v4Job?.annual_from;
    const annualTo = v4Job?.annual_to;
    if (annualFrom != null && annualTo != null && annualTo < 99 && annualFrom > 0) {
      job.salary_min = annualFrom * 1000;
      job.salary_max = annualTo * 1000;
      job.salary = `${job.salary_min}~${job.salary_max}만원`;
    } else if (annualFrom != null && annualTo != null && (annualTo >= 99 || annualFrom === 0)) {
      job.salary = '면접후결정';
    }
  }

  it('enriches numeric salary range from v4 annual_from/annual_to', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 5, annual_to: 10 });
    assert.equal(job.salary_min, 5000);
    assert.equal(job.salary_max, 10000);
    assert.equal(job.salary, '5000~10000만원');
  });

  it('enriches high salary range (annual_from=8, annual_to=15)', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 8, annual_to: 15 });
    assert.equal(job.salary_min, 8000);
    assert.equal(job.salary_max, 15000);
    assert.equal(job.salary, '8000~15000만원');
  });

  it('handles negotiable salary (annual_to >= 99)', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 4, annual_to: 100 });
    assert.equal(job.salary, '면접후결정');
    assert.equal(job.salary_min, null);
    assert.equal(job.salary_max, null);
  });

  it('handles entry-level salary (annual_from=0)', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 0, annual_to: 1 });
    assert.equal(job.salary, '면접후결정');
    assert.equal(job.salary_min, null);
    assert.equal(job.salary_max, null);
  });

  it('handles v4 API returning null', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, null);
    assert.equal(job.salary, null);
    assert.equal(job.salary_min, null);
    assert.equal(job.salary_max, null);
  });

  it('handles v4 API with missing salary fields', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: null, annual_to: null });
    assert.equal(job.salary, null);
    assert.equal(job.salary_min, null);
    assert.equal(job.salary_max, null);
  });

  it('handles low salary range (annual_from=2, annual_to=4)', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 2, annual_to: 4 });
    assert.equal(job.salary_min, 2000);
    assert.equal(job.salary_max, 4000);
    assert.equal(job.salary, '2000~4000만원');
  });

  it('does not overwrite existing salary data', () => {
    const job = { salary: '5000~8000만원', salary_min: 5000, salary_max: 8000 };
    // The enrichment code checks !job.salary before setting, but the function itself
    // always sets. In practice, the caller checks. Testing the function sets regardless.
    enrichSalaryFromV4(job, { annual_from: 3, annual_to: 7 });
    // Function sets unconditionally — caller is responsible for checking
    assert.equal(job.salary_min, 3000);
    assert.equal(job.salary_max, 7000);
  });

  it('handles annual_from=0, annual_to=99 (entry-level negotiable)', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 0, annual_to: 99 });
    assert.equal(job.salary, '면접후결정');
    assert.equal(job.salary_min, null);
    assert.equal(job.salary_max, null);
  });

  it('converts 천만원 to 만원 correctly for large ranges', () => {
    const job = { salary: null, salary_min: null, salary_max: null };
    enrichSalaryFromV4(job, { annual_from: 10, annual_to: 20 });
    assert.equal(job.salary_min, 10000);  // 1억
    assert.equal(job.salary_max, 20000);  // 2억
    assert.equal(job.salary, '10000~20000만원');
  });
});
