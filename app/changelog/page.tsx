'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type PatchNote = {
  id: number;
  version: string;
  title: string;
  content: string;
  released_at: string;
};

// Renders a small subset of markdown without any external dependency:
// ### headings, **bold**, and - list items.
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="font-cinzel text-sm font-bold text-dota-gold mt-4 mb-1 first:mt-0">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 font-barlow text-sm text-dota-text">
              <span className="text-dota-gold mt-px">—</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace('- ', '')) }} />
            </div>
          );
        }
        if (line.startsWith('**')) {
          return (
            <p key={i} className="font-barlow text-sm font-bold text-dota-text mt-3 mb-0.5"
              dangerouslySetInnerHTML={{ __html: renderInline(line) }}
            />
          );
        }
        if (line.trim() === '') return null;
        return (
          <p key={i} className="font-barlow text-sm text-dota-text leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderInline(line) }}
          />
        );
      })}
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

export default function ChangelogPage() {
  const [notes, setNotes]     = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/changelog');
      if (res.ok) {
        const json = await res.json();
        setNotes(json.notes);
      }
      setLoading(false);
      await fetch('/api/changelog', { method: 'POST' });
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-dota-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-cinzel text-4xl font-bold text-dota-gold">Changelog</h1>
        <div className="divider-gold w-48 mx-auto" />
      </div>

      {notes.map((note, i) => (
        <div key={note.id} className="panel p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3 flex-wrap">
              {i === 0 && <span className="badge-gold text-xs">Latest</span>}
              <h2 className="font-cinzel text-xl font-bold text-dota-gold">v{note.version}</h2>
              <span className="font-barlow font-semibold text-dota-text">{note.title}</span>
            </div>
            <span className="font-barlow text-xs text-dota-text-dim whitespace-nowrap">
              {new Date(note.released_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          </div>
          <div className="divider" />
          <SimpleMarkdown content={note.content} />
        </div>
      ))}
    </div>
  );
}
