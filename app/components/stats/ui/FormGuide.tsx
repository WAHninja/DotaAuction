'use client';

/**
 * A run of recent results as W/L pips, oldest on the left.
 *
 * The rightmost pip is the most recent game — the convention football tables
 * use, and the one readers assume whatever we pick, so going the other way
 * would invert the meaning for anyone who doesn't read the label.
 */
export default function FormGuide({ form, label = 'Recent form' }: {
  form: ('W' | 'L')[];
  label?: string;
}) {
  if (form.length === 0) {
    return <span className="font-barlow text-xs text-dota-text-dim">No games yet</span>;
  }

  const wins = form.filter(r => r === 'W').length;

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${label}: ${wins} wins from the last ${form.length} games, oldest first — ${form.join(' ')}`}
    >
      {form.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`
            w-5 h-5 rounded-sm flex items-center justify-center shrink-0
            font-barlow text-[10px] font-bold
            ${r === 'W'
              ? 'bg-dota-radiant/20 text-dota-radiant-light border border-dota-radiant/40'
              : 'bg-dota-dire/15 text-dota-dire-light border border-dota-dire/30'}
          `}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
