import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Routes under test are being built in parallel (issue #6). Until they are merged, these fail with 404 on every path.
// Fixtures live in a temp dir: runs/ is read-only.
const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };

const NIGHT = '2026-11-01';
const EMPTY = '2026-11-02';
const BAD = '2026-11-03';

// Written out of order on purpose: the page and JSON must sort by job.
const LINES = [
  '{"at":"2026-11-01T02:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-11-01T01:00:00+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
  '{"at":"2026-11-01T03:00:00+01:00","job":"digest/render","status":"ok","owner":null}',
  '{"at":"2026-11-01T04:00:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
];

beforeAll(() => {
  writeFileSync(join(runsDir, `${NIGHT}.jsonl`), LINES.join('\n') + '\n');
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD}.jsonl`),
    ['not json', LINES[0], '{"at":1}', LINES[2], '[]'].join('\n') + '\n',
  );
});

// Job names in the order they appear in the HTML.
function jobOrder(html: string, jobs: string[]): string[] {
  return jobs
    .map((job) => ({ job, at: html.indexOf(job) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.job);
}

const SORTED_JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup'];

describe('GET /digest/:night', () => {
  it('200 with an HTML table, one row per job, sorted by job', async () => {
    const res = await createApp(config).request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(html).toContain('<table');
    for (const job of SORTED_JOBS) expect(html).toContain(job);
    expect(jobOrder(html, SORTED_JOBS)).toEqual(SORTED_JOBS);
  });

  it('404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/2030-01-01');
    expect(res.status).toBe(404);
  });

  it('empty file renders the text "nothing ran"', async () => {
    const res = await createApp(config).request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('night with a bad line still renders 200 and shows the bad-line count', async () => {
    const res = await createApp(config).request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest/render');
    // Three lines are bad: "not json", {"at":1}, []. Count is shown next to the word "bad".
    expect(html).toMatch(/\b3\b[^<]*bad|bad[^<]*\b3\b/i);
  });
});

describe('GET /api/digest/:night', () => {
  it('200 JSON { night, rows, badLines } with rows sorted by job', async () => {
    const res = await createApp(config).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe(NIGHT);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(SORTED_JOBS);
  });

  it('404 for a night with no file', async () => {
    const res = await createApp(config).request('/api/digest/2030-01-01');
    expect(res.status).toBe(404);
  });

  it('empty file gives 200 with no rows', async () => {
    const res = await createApp(config).request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 });
  });

  it('night with a bad line gives 200 and counts it in badLines', async () => {
    const res = await createApp(config).request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { badLines: number; rows: { job: string }[] };
    expect(body.badLines).toBe(3);
    expect(body.rows.map((r) => r.job)).toEqual(['digest/render', 'lane/sync']);
  });
});

describe('page and JSON agree', () => {
  it('same jobs in the same order for the same night', async () => {
    const app = createApp(config);
    const html = await (await app.request(`/digest/${NIGHT}`)).text();
    const body = (await (await app.request(`/api/digest/${NIGHT}`)).json()) as { rows: { job: string }[] };
    const jsonJobs = body.rows.map((r) => r.job);
    expect(jobOrder(html, jsonJobs)).toEqual(jsonJobs);
  });
});
