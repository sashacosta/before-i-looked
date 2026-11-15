import type { Digest, DigestRow } from '../digest/types.js';

// A row is flagged when it retried 3+ times or its last run failed. The "!" is visible text,
// so the flag survives without colour (styleguide: never colour alone).
const RETRY_FLAG = 3;

function isFlagged(row: DigestRow): boolean {
  return row.retries >= RETRY_FLAG || row.lastStatus === 'fail';
}

export function DigestView({ digest }: { digest: Digest }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.badLines > 0 && <p class="warn">bad lines: {digest.badLines}</p>}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr class={isFlagged(row) ? 'warn' : undefined}>
                <td>
                  {isFlagged(row) && '! '}
                  {row.job}
                </td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
