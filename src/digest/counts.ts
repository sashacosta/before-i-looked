import type { Digest } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Rows keep only runs, retries and lastStatus. retry = sum of retries (exact). fail = rows whose
// last line is "fail" (exact when a failure is never followed by a retry or ok). ok = the rest of the lines.
export function countNight(d: Digest): NightCounts {
  let lines = 0;
  let retry = 0;
  let fail = 0;
  for (const r of d.rows) {
    lines += r.runs;
    retry += r.retries;
    if (r.lastStatus === 'fail') fail++;
  }
  return { ok: lines - retry - fail, retry, fail };
}
