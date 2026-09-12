'use client';

import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { RatingPoint } from '@/types';
import { STARTING_RATING } from '@/lib/stats/compute/rating';

/**
 * A player's rating over the games they have played.
 *
 * The first genuinely time-aware view in the app. Every other figure is an
 * all-time aggregate, in which a player who has improved sharply is
 * indistinguishable from one who peaked a year ago.
 *
 * Plotted against their own game count rather than game id or date. Ids are
 * league-wide, so a player who sat out fifty games would show a long flat
 * stretch that says nothing about them; dates are unusable because
 * games.finished_at is null on rows predating that column.
 *
 * The 1500 reference line is doing real work: without it a rating that has
 * drifted from 1500 to 1530 looks like a dramatic climb, because the y-axis
 * autoscales to whatever range the data occupies.
 */
export default function RatingHistoryPanel({ history, provisional }: {
  history: RatingPoint[];
  provisional: boolean;
}) {
  // One point is a dot, not a trend. Below a handful of games the chart says
  // less than the rating figure above it already does.
  if (history.length < 5) return null;

  const data = history.map((point, i) => ({
    game: i + 1,
    rating: point.rating,
    delta: point.delta,
  }));

  const ratings = data.map(d => d.rating);
  const low  = Math.min(...ratings, STARTING_RATING);
  const high = Math.max(...ratings, STARTING_RATING);
  const pad  = Math.max(20, Math.round((high - low) * 0.15));

  const peak   = Math.max(...ratings);
  const trough = Math.min(...ratings);

  return (
    <section className="panel overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3 flex-wrap">
        <TrendingUp className="w-4 h-4 shrink-0 text-dota-gold" aria-hidden="true" />
        <div>
          <h2 className="font-cinzel text-lg font-bold text-dota-gold">Rating History</h2>
          <p className="font-barlow text-xs text-dota-text-muted mt-0.5">
            Rating after each game played · starts at {STARTING_RATING}
          </p>
        </div>
        <span className="ml-auto shrink-0 font-barlow text-[11px] text-dota-text-dim tabular-nums">
          peak {peak} · low {trough}
        </span>
      </div>

      <div className="p-4 flex-1">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
              <CartesianGrid stroke="#2e3d56" strokeDasharray="2 4" vertical={false} />

              <XAxis
                dataKey="game"
                tick={{ fill: '#8a8f99', fontSize: 11 }}
                stroke="#2e3d56"
                // Games are dense; letting recharts choose ticks avoids a
                // solid bar of overlapping numbers at 130 points.
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[low - pad, high + pad]}
                tick={{ fill: '#8a8f99', fontSize: 11 }}
                stroke="#2e3d56"
                width={48}
                allowDecimals={false}
              />

              <ReferenceLine
                y={STARTING_RATING}
                stroke="#555d6b"
                strokeDasharray="4 4"
                label={{ value: 'start', fill: '#555d6b', fontSize: 10, position: 'insideTopLeft' }}
              />

              <RechartsTooltip
                contentStyle={{
                  background: '#1a2130',
                  border: '1px solid #3d4f6b',
                  borderRadius: 2,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#8a8f99' }}
                labelFormatter={(g) => `Game ${g}`}
                formatter={(value: number, _name, entry) => {
                  const d = (entry?.payload as { delta: number } | undefined)?.delta ?? 0;
                  const sign = d > 0 ? '+' : '';
                  return [`${value}  (${sign}${d})`, 'Rating'];
                }}
              />

              <Line
                type="monotone"
                dataKey="rating"
                stroke="#c8a951"
                strokeWidth={2}
                // Dots are suppressed at this density — 130 markers reads as a
                // dotted band rather than a line — but kept on hover.
                dot={false}
                activeDot={{ r: 4, fill: '#c8a951' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {provisional && (
          <p className="font-barlow text-[11px] text-dota-text-dim mt-2">
            Still settling — early swings are the rating finding its level, not form.
          </p>
        )}
      </div>
    </section>
  );
}
