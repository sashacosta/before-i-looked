// The contract for the morning digest (plan.md § 1). Every part of section 2 builds on this.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log: keep the row, render "—"
  runs: number; // every parsed line for the job
  retries: number; // lines with status "retry"
  fails: number; // lines with status "fail"
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string; // as written in the log, offset kept (never converted to UTC)
  lastAt: string;
};

export type Digest = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse, counted never thrown
};

// Signature of readNight(runsDir, night), implemented in src/digest/read.ts. Reads runs/<night>.jsonl.
export type ReadNight = (runsDir: string, night: string) => Digest | null;
