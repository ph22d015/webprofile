import { useMemo, useState } from 'react';
import type { Publication } from '@/data/cv';

type Props = { pubs: Publication[]; myNames: string[] };

function bibtex(p: Publication): string {
  const esc = (s: string) => s.replace(/[{}\\]/g, '');
  const fields: [string, string | number | undefined][] = [
    ['title', `{${esc(p.title)}}`],
    ['author', esc(p.authors.replace(/\s+et al\.?$/, ' and others'))],
    [p.type === 'journal' ? 'journal' : 'booktitle', esc(p.venue)],
    ['year', p.year],
    ['doi', p.doi],
    ['url', p.url ?? (p.doi ? `https://doi.org/${p.doi}` : undefined)],
    ['note', p.details],
  ];
  const body = fields.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `  ${k} = {${v}}`).join(',\n');
  return `@${p.type === 'journal' ? 'article' : 'inproceedings'}{${p.id},\n${body}\n}`;
}

function Authors({ text, myNames }: { text: string; myNames: string[] }) {
  const name = myNames.find((n) => text.includes(n));
  if (!name) return <>{text}</>;
  const [a, b] = text.split(name);
  return <>{a}<strong className="me">{name}</strong>{b}</>;
}

export default function PubList({ pubs, myNames }: Props) {
  const [type, setType] = useState<'all' | 'journal' | 'conference'>('all');
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return pubs
      .filter((p) => type === 'all' || p.type === type)
      .filter((p) => !t || `${p.title} ${p.authors} ${p.venue} ${p.tags.join(' ')}`.toLowerCase().includes(t))
      .sort((a, b) => b.year - a.year);
  }, [pubs, type, q]);

  const years = [...new Set(list.map((p) => p.year))];

  async function copy(p: Publication) {
    try {
      await navigator.clipboard.writeText(bibtex(p));
      setCopied(p.id);
      window.setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1800);
    } catch {
      setOpen(p.id); // clipboard blocked: show the BibTeX so it can be selected manually
    }
  }

  return (
    <div className="pubs">
      <div className="pub-toolbar">
        <div className="seg" role="group" aria-label="Filter by type">
          {(['all', 'journal', 'conference'] as const).map((t) => (
            <button key={t} type="button" className={type === t ? 'active' : ''} aria-pressed={type === t} onClick={() => setType(t)}>
              {t === 'all' ? `All (${pubs.length})` : t === 'journal' ? 'Journal' : 'Conference'}
            </button>
          ))}
        </div>
        <label className="pub-search">
          <span className="sr-only">Filter publications</span>
          <input type="search" placeholder="Filter by title, venue, topic…" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {list.length === 0 && <p className="pub-empty">No publications match.</p>}

      {years.map((y) => (
        <section key={y} className="pub-year" aria-labelledby={`y${y}`}>
          <h2 id={`y${y}`}>{y}</h2>
          <ol>
            {list.filter((p) => p.year === y).map((p) => (
              <li key={p.id} id={p.id} className="pub card">
                <div className="pub-head">
                  <span className={`badge ${p.type}`}>{p.type === 'journal' ? 'Journal' : 'Conference'}</span>
                  {p.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                </div>
                <h3>
                  {p.doi || p.url ? (
                    <a href={p.url ?? `https://doi.org/${p.doi}`} rel="noopener noreferrer" target="_blank">{p.title}</a>
                  ) : (
                    p.title
                  )}
                </h3>
                <p className="pub-authors"><Authors text={p.authors} myNames={myNames} /></p>
                <p className="pub-venue"><em>{p.venue}</em>{p.details ? `, ${p.details}` : ''} ({p.year})</p>
                <div className="pub-actions">
                  <button type="button" onClick={() => copy(p)}>{copied === p.id ? '✓ Copied' : 'Copy BibTeX'}</button>
                  <button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                    {open === p.id ? 'Hide BibTeX' : 'Show BibTeX'}
                  </button>
                  {p.doi && <a href={`https://doi.org/${p.doi}`} rel="noopener noreferrer" target="_blank">DOI</a>}
                </div>
                {open === p.id && <pre className="pub-bib">{bibtex(p)}</pre>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
