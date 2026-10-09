#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /\bSEED_[A-Z0-9_]+/g, name: 'SEED_* constant' },
  { pattern: /['"]\.\.?\/.*mockData['"]/g, name: 'mockData import' },
  { pattern: /\bmockData\b/g, name: 'mockData reference' },
  { pattern: /unsplash\.com/gi, name: 'Unsplash placeholder' },
  { pattern: /picsum\.photos/gi, name: 'Picsum placeholder' },
  { pattern: /\blorem\b/gi, name: 'Lorem ipsum placeholder' },
  { pattern: /\bARCHIVE_PRODUCTS\b/g, name: 'ARCHIVE_PRODUCTS constant' },
  { pattern: /\bseedData\b/g, name: 'seedData import/reference' },
  { pattern: /\btargetsSeedData\b/g, name: 'targetsSeedData import/reference' },
  { pattern: /\/src\/assets\/images\//g, name: 'Hardcoded src/assets/images path' },
];

let violations = [];

function scanDir(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx?|jsx?|css|html)$/.test(entry)) {
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const { pattern, name } of FORBIDDEN_PATTERNS) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            // Check if it's a test file or comment explaining no-seed check
            if (fullPath.includes('check-no-seed') || fullPath.includes('.test.')) {
              continue;
            }
            violations.push({
              file: fullPath,
              line: idx + 1,
              rule: name,
              text: line.trim(),
            });
          }
        }
      });
    }
  }
}

scanDir('src');

if (violations.length > 0) {
  console.error('\n❌ VIOLATION: Seed or mock data detected in src/:');
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} [${v.rule}] -> ${v.text}`);
  });
  console.error(`\nTotal violations: ${violations.length}. Build rejected.\n`);
  process.exit(1);
} else {
  console.log('✅ Check passed: Zero seed, demo, or placeholder data found in src/.');
  process.exit(0);
}
