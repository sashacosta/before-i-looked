import type { Digest } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Exact per-status line counts: ok = every parsed line that is neither retry nor fail.
export function countNight(d: Digest): NightCounts {
  let runs = 0;
  let retry = 0;
  let fail = 0;
  for (const r of d.rows) {
    runs += r.runs;
    retry += r.retries;
    fail += r.fails;
  }
  return { ok: runs - retry - fail, retry, fail };
}
