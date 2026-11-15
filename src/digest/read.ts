import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Digest, DigestRow, JobStatus } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

type Line = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

// Parse at the edge: anything that isn't a well-formed line is null, never a throw.
function parseLine(text: string): Line | null {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof o !== 'object' || o === null) return null;
  const r = o as Record<string, unknown>;
  if (typeof r.at !== 'string' || typeof r.job !== 'string' || typeof r.status !== 'string') return null;
  if (!STATUSES.includes(r.status)) return null;
  return {
    at: r.at,
    job: r.job,
    status: r.status as JobStatus,
    owner: typeof r.owner === 'string' ? r.owner : null,
    error: typeof r.error === 'string' ? r.error : null,
  };
}

// Reads runs/<night>.jsonl into one row per job. null = no file for that night.
export function readNight(runsDir: string, night: string): Digest | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null; // keeps :night from walking out of runsDir
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    const row = rows.get(line.job);
    if (!row) {
      rows.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    row.runs++;
    if (line.status === 'retry') row.retries++;
    row.owner = line.owner ?? row.owner;
    // Log order is time order; later lines win, and the time keeps its offset.
    row.lastStatus = line.status;
    row.lastError = line.error;
    row.lastAt = line.at;
  }
  return { night, rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)), badLines };
}
