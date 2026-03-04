'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type PatchNote = {
  id: number;
  version: string;
  title: string;
  content: string;
  released_at: string;
};

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

      // Mark as seen
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

      {/* Page heading */}
      <div className="text-center space-y-2">
        <h1 className="font-cinzel text-4xl font-bold text-dota-gold">Changelog</h1>
        <div className="divider-gold w-48 mx-auto" />
      </div>

      {/* Patch note cards */}
      {notes.map((note, i) => (
        <div key={note.id} className="panel p-6 space-y-4">

          {/* Header */}
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-3">
              {i === 0 && (
                <span className="badge-gold text-xs">Latest</span>
              )}
              <h2 className="font-cinzel text-xl font-bold text-dota-gold">
                v{note.version}
              </h2>
              <span className="font-barlow font-semibold text-dota-text">
                {note.title}
              </span>
            </div>
            <span className="font-barlow text-xs text-dota-text-dim whitespace-nowrap">
              {new Date(note.released_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          </div>

          <div className="divider" />

          {/* Markdown content */}
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:font-cinzel prose-headings:text-dota-text prose-headings:font-bold
            prose-h3:text-base prose-h3:text-dota-gold prose-h3:mt-4 prose-h3:mb-2
            prose-p:font-barlow prose-p:text-dota-text prose-p:leading-relaxed
            prose-strong:text-dota-text prose-strong:font-bold
            prose-li:font-barlow prose-li:text-dota-text
            prose-ul:space-y-1 prose-ul:my-2
            [&>ul]:list-none [&>ul>li]:before:content-['—'] [&>ul>li]:before:text-dota-gold [&>ul>li]:before:mr-2">
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
