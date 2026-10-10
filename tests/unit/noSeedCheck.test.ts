import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Task 1: the build must fail if seed data creeps back into src/.
 * These tests execute the real `npm run check:no-seed` script.
 */
const ROOT = process.cwd();
const GUARD = join(ROOT, 'scripts', 'check-no-seed.mjs');

function runGuard(): { status: number; output: string } {
  const res = spawnSync(process.execPath, [GUARD], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    status: res.status ?? -1,
    output: `${res.stdout || ''}${res.stderr || ''}`,
  };
}

const PROBE = join(ROOT, 'src', '__no_seed_probe__.ts');
const CLEANUP: string[] = [];

afterEach(() => {
  while (CLEANUP.length) {
    const file = CLEANUP.pop()!;
    if (existsSync(file)) unlinkSync(file);
  }
});

describe('no-seed guard', () => {
  it('passes on the current source tree', () => {
    const { status, output } = runGuard();
    expect(output).toContain('zero seed, demo, or placeholder data');
    expect(status).toBe(0);
  });

  it('fails and reports file + line when a SEED_ constant returns', () => {
    writeFileSync(
      PROBE,
      `export const SEED_PRODUCTS = [{ id: 'p1', name: 'Seeded Coat' }];\n`
    );
    CLEANUP.push(PROBE);

    const { status, output } = runGuard();
    expect(status).toBe(1);
    expect(output).toContain('__no_seed_probe__.ts:1');
    expect(output).toContain('SEED_* constant');
  });

  it('fails when Math.random is used to fabricate metrics', () => {
    writeFileSync(PROBE, `export const visitorsNow = Math.floor(Math.random() * 500);\n`);
    CLEANUP.push(PROBE);

    const { status, output } = runGuard();
    expect(status).toBe(1);
    expect(output).toContain('__no_seed_probe__.ts:1');
    expect(output).toContain('Math.random');
  });

  it('fails on Unsplash / Picsum / lorem placeholder content', () => {
    writeFileSync(
      PROBE,
      `export const cover = 'https://images.unsplash.com/photo-1';\nexport const body = 'lorem ipsum';\n`
    );
    CLEANUP.push(PROBE);

    const { status, output } = runGuard();
    expect(status).toBe(1);
    expect(output).toContain('Unsplash placeholder image');
    expect(output).toContain('Lorem ipsum');
  });

  it('fails on base64 data-URL pipelines', () => {
    writeFileSync(PROBE, `export const read = (f: File) => f;\nreader.readAsDataURL(file);\n`);
    CLEANUP.push(PROBE);

    const { status, output } = runGuard();
    expect(status).toBe(1);
    expect(output).toContain('readAsDataURL');
  });

  it('leaves the source tree clean after the run', () => {
    expect(existsSync(PROBE)).toBe(false);
    expect(runGuard().status).toBe(0);
  });
});

// Ensure the probe directory exists (it always does, but be explicit).
if (!existsSync(join(ROOT, 'src'))) mkdirSync(join(ROOT, 'src'), { recursive: true });
