#!/usr/bin/env node
/**
 * npm run check:no-seed
 *
 * Fails the build if seeded / demo / fabricated content creeps back into
 * `src/`. Every pattern below is forbidden; a hit prints the file, line and
 * the offending source line, then exits 1.
 *
 * Test files (*.test.*, *.spec.*) and this script are skipped on purpose.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const FORBIDDEN_PATTERNS = [
  // --- seed / mock modules -------------------------------------------------
  { pattern: /\bSEED_[A-Z0-9_]+/g, name: 'SEED_* constant' },
  { pattern: /['"]\.\.?\/.*mockData['"]/g, name: 'mockData import' },
  { pattern: /\bmockData\b/g, name: 'mockData reference' },
  { pattern: /\bseedData\b/g, name: 'seedData reference' },
  { pattern: /\btargetsSeedData\b/g, name: 'targetsSeedData reference' },
  { pattern: /\bARCHIVE_PRODUCTS\b/g, name: 'ARCHIVE_PRODUCTS constant' },
  { pattern: /\bMOCK_[A-Z0-9_]+/g, name: 'MOCK_* constant' },
  { pattern: /\bSAMPLE_[A-Z0-9_]+\b/g, name: 'SAMPLE_* constant' },

  // --- demo / fake mode ----------------------------------------------------
  { pattern: /\bdemo\b/gi, name: 'demo word / demo mode' },
  { pattern: /\bdemoMode\b/g, name: 'demo mode flag' },
  { pattern: /\bfake[A-Z][A-Za-z]*\b/g, name: 'fake* identifier' },
  { pattern: /\bplaceholderData\b/g, name: 'placeholderData' },
  { pattern: /\bfallbackData\b/g, name: 'fallbackData' },

  // --- third-party stock / placeholder imagery -----------------------------
  { pattern: /unsplash\.com/gi, name: 'Unsplash placeholder image' },
  { pattern: /picsum\.photos/gi, name: 'Picsum placeholder image' },
  { pattern: /placehold\.(co|com|net)/gi, name: 'placehold.* placeholder image' },
  { pattern: /lorem\.ipsum/gi, name: 'Lorem ipsum' },
  { pattern: /\blorem\b/gi, name: 'Lorem ipsum' },
  { pattern: /gtv-videos-bucket\/sample/g, name: 'Google sample video fallback' },
  { pattern: /ForBiggerBlazes/g, name: 'Google sample video fallback' },

  // --- broken or dev-only asset paths --------------------------------------
  { pattern: /\/src\/assets\/images\//g, name: 'Hardcoded /src/assets/images path' },
  { pattern: /assets[\\/]images[\\/]/g, name: 'Hardcoded assets/images path' },
  { pattern: /src\/assets\//g, name: 'Hardcoded src/assets path' },

  // --- base64 pipelines (Storage URLs only) --------------------------------
  // CSS may inline an SVG noise texture; only script files are gated.
  {
    pattern: /readAsDataURL/g,
    name: 'FileReader.readAsDataURL (base64 pipeline)',
    exts: ['ts', 'tsx', 'js', 'jsx'],
  },
  {
    pattern: /['"]data:image\//g,
    name: 'Inline data:image URL',
    exts: ['ts', 'tsx', 'js', 'jsx'],
  },
  {
    pattern: /['"]data:video\//g,
    name: 'Inline data:video URL',
    exts: ['ts', 'tsx', 'js', 'jsx'],
  },

  // --- fabricated metrics --------------------------------------------------
  { pattern: /\bMath\.random\s*\(/g, name: 'Math.random() (never allowed for ids/metrics)' },
  {
    pattern: /'\d{1,3}(?:,\d{3})+(?:\.\d+)?'/g,
    name: 'Hardcoded grouped number (fake KPI)',
  },
  { pattern: /\|\|\s*'\d[\d.,]*'\s*[)\];,]/g, name: 'Numeric string fallback' },

  // --- known fabricated identities / artefacts -----------------------------
  {
    pattern: /Elena Rostova|Sofia Lindqvist|sofia\.lindqvist@archive\.com|merchandiser@zejesh\.fi|system_daemon|CATALOG_SYNC|#ZE-\d{4,}|FI\d{10,}[A-Z]/g,
    name: 'Fabricated identity / order artefact',
  },
];

const SCAN_ROOTS = ['src'];
const SCAN_EXT = /\.(tsx?|jsx?|css|html)$/;
const SKIP = (path) => path.includes('check-no-seed') || /\.(test|spec)\./.test(path);

/**
 * Documented exceptions. Each entry must name the rule it is exempt from and
 * the reason — no blanket escapes.
 */
const ALLOWLIST = [
  {
    file: 'src/components/VeoMotionModal.tsx',
    rule: 'FileReader.readAsDataURL (base64 pipeline)',
    reason:
      'Encodes the chosen still for the server-side Veo API request only; the payload is never written to the database.',
  },
];

const violations = [];

function scanDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      scanDir(fullPath);
      continue;
    }
    if (!SCAN_EXT.test(entry) || SKIP(fullPath)) continue;
    const fileExt = entry.split('.').pop().toLowerCase();

    const content = readFileSync(fullPath, 'utf8');
    const relPath = relative(process.cwd(), fullPath).replace(/\\/g, '/');
    const allowedRules = ALLOWLIST.filter((a) => a.file === relPath).map((a) => a.rule);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Allow the single neutral placeholder asset constant and its comments.
      const isNeutralPlaceholderLine =
        line.includes('NEUTRAL_PLACEHOLDER_IMG') || line.includes('/placeholder.svg');
      for (const { pattern, name, exts } of FORBIDDEN_PATTERNS) {
        if (allowedRules.includes(name)) continue;
        if (isNeutralPlaceholderLine && name.includes('placeholder')) continue;
        if (exts && !exts.includes(fileExt)) continue;
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            rule: name,
            text: line.trim().slice(0, 160),
          });
        }
      }
    });
  }
}

for (const root of SCAN_ROOTS) scanDir(root);

if (violations.length > 0) {
  console.error('\nSEED CHECK FAILED: forbidden seeded / demo / placeholder data found in src/:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`      ${v.text}\n`);
  }
  console.error(`Total violations: ${violations.length}. Build rejected.\n`);
  process.exit(1);
}

console.log('Check passed: zero seed, demo, or placeholder data found in src/.');
process.exit(0);
