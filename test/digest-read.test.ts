import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const d = readNight('runs', '2026-10-28')!;
    expect(d.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(d.badLines).toBe(1);
    const fx = d.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null, owner: 'rook' });
    expect(fx.firstAt).toBe('2026-10-29T01:30:00+01:00');
    expect(d.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(d.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
  });

  it('returns null for a night with no file or a bad night', () => {
    expect(readNight('runs', '2030-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('counts bad lines and renders an empty file as no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-11-01.jsonl'), '');
    writeFileSync(join(dir, '2026-11-02.jsonl'), 'nope\n{"at":1}\n[]\n{"at":"t","job":"j","status":"weird"}\n');
    expect(readNight(dir, '2026-11-01')).toEqual({ night: '2026-11-01', rows: [], badLines: 0 });
    expect(readNight(dir, '2026-11-02')).toEqual({ night: '2026-11-02', rows: [], badLines: 4 });
  });
});
