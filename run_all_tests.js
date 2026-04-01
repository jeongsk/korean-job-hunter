#!/usr/bin/env node
/**
 * Unified test runner for korean-job-hunter
 * Runs all test_*.js files and reports aggregate results.
 * Usage: node run_all_tests.js [--verbose] [--filter <pattern>]
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filterIdx = args.indexOf('--filter');
const filter = filterIdx >= 0 ? args[filterIdx + 1] : null;

const testDir = __dirname;
const files = fs.readdirSync(testDir)
  .filter(f => f.startsWith('test_') && f.endsWith('.js'))
  .sort();

const filtered = filter ? files.filter(f => f.includes(filter)) : files;

if (filtered.length === 0) {
  console.log('No test files found.');
  process.exit(0);
}

let totalPass = 0, totalFail = 0, errored = [];
const startTime = Date.now();

for (const f of filtered) {
  const filePath = path.join(testDir, f);
  try {
    const out = execSync(`node "${filePath}"`, { encoding: 'utf8', timeout: 30000, cwd: testDir });
    
    // Extract pass/fail counts from various output formats
    let pass = 0, fail = 0;
    
    // Pattern: "N/M passed" or "N/M tests passed" or "N passed, M failed"
    const passMatches = out.match(/(\d+)\/(\d+)\s*(?:passed|tests?\s*passed)/g) || [];
    passMatches.forEach(m => {
      const r = m.match(/(\d+)\/(\d+)/);
      pass += parseInt(r[1]);
    });
    
    const failMatches = out.match(/(\d+)\s*failed/g) || [];
    failMatches.forEach(m => {
      fail += parseInt(m.match(/(\d+)/)[1]);
    });
    
    // Alternate: "X passed, Y failed" or "Passed: X/Y"
    const altPass = out.match(/(\d+)\s+passed/g);
    if (altPass && pass === 0) {
      altPass.forEach(m => { pass += parseInt(m.match(/(\d+)/)[1]); });
    }
    
    // Pattern: "Passed: X/Y" or "Results: X/Y"
    const passedSlash = out.match(/(?:Passed|Results?):\s*(\d+)\/(\d+)/);
    if (passedSlash && pass === 0) {
      pass = parseInt(passedSlash[1]);
    }
    
    // Pattern: "X/Y" on its own line (e.g. e2e_parsing "Results: 7/7")
    const simpleSlash = out.match(/(\d+)\/(\d+)\s*$/m);
    if (simpleSlash && pass === 0) {
      pass = parseInt(simpleSlash[1]);
    }
    
    // Pattern: "X/X deadline urgency tests passed"
    const namedPass = out.match(/(\d+)\/(\d+)\s+\w+.*tests?\s+passed/);
    if (namedPass && pass === 0) {
      pass = parseInt(namedPass[1]);
    }
    
    // Pattern: "X/X JobKorea parsing tests passed"
    const jkPass = out.match(/(\d+)\/(\d+)\s+\w+\s+parsing tests passed/);
    if (jkPass && pass === 0) {
      pass = parseInt(jkPass[1]);
    }
    
    const hasExplicitFail = out.includes('FAIL') && !out.includes('✅ PASS');
    const ok = fail === 0 && !hasExplicitFail;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${f}: ${pass || '?'} passed${fail ? `, ${fail} failed` : ''}`);
    
    if (verbose && pass === 0 && fail === 0) {
      const lines = out.trim().split('\n');
      lines.slice(-3).forEach(l => console.log('   ', l));
    }
    
    totalPass += pass;
    totalFail += fail;
    if (!ok) errored.push(f);
  } catch (e) {
    console.log(`❌ ${f}: ERROR - ${e.message.slice(0, 100)}`);
    totalFail += 1;
    errored.push(f);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('─'.repeat(50));
console.log(`📊 ${filtered.length} suites | ${totalPass} passed | ${totalFail} failed | ${elapsed}s`);

if (errored.length > 0) {
  console.log(`❌ Failed: ${errored.join(', ')}`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
