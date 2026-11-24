const metrics = [
  ['Significant strikes', 'sig_strikes'],
  ['Total strikes', 'total_strikes'],
  ['Takedowns', 'takedowns'],
  ['Knockdowns', 'knockdowns'],
  ['Submission attempts', 'submission_attempts'],
  ['Reversals', 'reversals'],
  ['Control time', 'control_time_sec'],
  ['Head strikes', 'head'],
  ['Body strikes', 'body'],
  ['Leg strikes', 'leg'],
  ['Distance strikes', 'distance'],
  ['Clinch strikes', 'clinch'],
  ['Ground strikes', 'ground'],
];

function statValue(row, field) {
  if (row?.[field] != null) {
    const value = row[field];
    return field === 'control_time_sec'
      ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
      : value;
  }
  const landed = row?.[`${field}_landed`];
  const attempted = row?.[`${field}_attempted`];
  if (landed == null) return '—';
  return attempted == null ? landed : `${landed}/${attempted}`;
}

function StatsTable({ rows, names }) {
  const a = rows.find(row => row.corner === 'a');
  const b = rows.find(row => row.corner === 'b');
  return (
    <table className="w-full text-sm">
      <thead><tr>
        <th scope="col" className="py-2 text-left">Statistic</th>
        {names.map((name, index) => <th key={index} scope="col" className="py-2 px-2 text-right">{name}</th>)}
      </tr></thead>
      <tbody>
        {metrics.map(([label, field]) => {
          const values = [statValue(a, field), statValue(b, field)];
          if (values.every(value => value === '—')) return null;
          return <tr key={field} className="border-t border-border/50">
            <th scope="row" className="py-2 text-left font-normal">{label}</th>
            {values.map((value, index) => <td key={index} className="py-2 px-2 text-right tabular-nums">{value}</td>)}
          </tr>;
        })}
      </tbody>
    </table>
  );
}

export default function BoutStatistics({ statistics, names }) {
  const { totals = [], rounds = [], scorecards = [] } = statistics ?? {};
  if (!(totals.length || rounds.length || scorecards.length)) return null;
  const periods = [...new Set(rounds.map(row => row.round_number))].sort((a, b) => a - b);
  return (
    <section className="space-y-3" aria-label="Fight statistics">
      <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Fight Statistics</h2>
      <p className="text-xs text-muted-foreground">Post-fight data from UFCalendar. Strike and takedown ratios show landed / attempted.</p>
      {totals.length > 0 && <StatsTable rows={totals} names={names} />}
      {periods.map(round => (
        <details key={round} className="rounded-lg border border-border/50 px-3 py-2">
          <summary className="cursor-pointer font-semibold">Round {round}</summary>
          <StatsTable rows={rounds.filter(row => row.round_number === round)} names={names} />
        </details>
      ))}
      {scorecards.length > 0 && <div className="space-y-2">
        <h3 className="font-semibold">Judges’ Scorecards</h3>
        <p className="text-xs text-muted-foreground">{names.join(' / ')}</p>
        {scorecards.map((card, index) => (
          <details key={card.judge_id ?? index} className="rounded-lg border border-border/50 px-3 py-2">
            <summary className="cursor-pointer">
              {card.judge_name ?? 'Judge'} · {card.total_a ?? '—'}–{card.total_b ?? '—'}
            </summary>
            {card.rounds?.length > 0 && <ul className="mt-2 text-sm">
              {card.rounds.map(row => <li key={row.round}>Round {row.round} · {row.a ?? '—'}–{row.b ?? '—'}</li>)}
            </ul>}
          </details>
        ))}
      </div>}
    </section>
  );
}
