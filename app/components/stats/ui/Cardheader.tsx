'use client';

import type { ElementType } from 'react';

/** Icon + title + subtitle header used at the top of each stats panel. */
export default function CardHeader({ icon: Icon, iconClass, title, subtitle }: {
  icon: ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-dota-border flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div>
        <h3 className="font-cinzel text-lg font-bold text-dota-gold">{title}</h3>
        <p className="font-barlow text-xs text-dota-text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
