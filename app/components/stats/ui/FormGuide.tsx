'use client';

/**
 * A run of recent results as W/L pips, oldest on the left.
 *
 * The rightmost pip is the most recent game — the convention football tables
 * use, and the one readers assume whatever we pick, so going the other way
 * would invert the meaning for anyone who doesn't read the label.
 */
export default function FormGuide({ form, label = 'Recent form', max, compact = false }: {
  form: ('W' | 'L')[];
  label?: string;
  /** Show only the most recent N. The tail is trimmed, not the head, so the
   *  rightmost pip is still the latest game. */
  max?: number;
  /** Smaller pips for tight spaces such as the dashboard cards. */
  compact?: boolean;
}) {
  if (form.length === 0) {
    return <span className="font-barlow text-xs text-dota-text-dim">No games yet</span>;
  }

  const shown = max ? form.slice(-max) : form;
  const wins = shown.filter(r => r === 'W').length;

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${label}: ${wins} wins from the last ${shown.length} games, oldest first — ${shown.join(' ')}`}
    >
      {shown.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`
            ${compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'}
            rounded-sm flex items-center justify-center shrink-0
            font-barlow font-bold
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
