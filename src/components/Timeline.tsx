import { useMemo, useState } from 'react';
import type { TimelineItem, TimelineKind } from '@/data/cv';

type Props = { items: TimelineItem[]; labels: Record<TimelineKind, string> };

export default function Timeline({ items, labels }: Props) {
  const kinds = Object.keys(labels) as TimelineKind[];
  const [active, setActive] = useState<Set<TimelineKind>>(new Set(kinds));

  const shown = useMemo(
    () => items.filter((i) => active.has(i.kind)).sort((a, b) => b.start.localeCompare(a.start)),
    [items, active],
  );

  const toggle = (k: TimelineKind) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k) && next.size === 1) return new Set(kinds); // never leave the list empty
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const only = (k: TimelineKind) => setActive(new Set([k]));
  const counts = useMemo(() => Object.fromEntries(kinds.map((k) => [k, items.filter((i) => i.kind === k).length])), [items]);

  return (
    <div className="tl">
      <div className="tl-filters" role="group" aria-label="Show timeline categories">
        <button type="button" className={`tl-all ${active.size === kinds.length ? 'on' : ''}`} onClick={() => setActive(new Set(kinds))}>
          Everything
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`tl-chip k-${k} ${active.has(k) ? 'on' : ''}`}
            aria-pressed={active.has(k)}
            onClick={() => toggle(k)}
            onDoubleClick={() => only(k)}
            title="Click to toggle, double-click to show only this"
          >
            <span className="dot" aria-hidden="true" /> {labels[k]} <span className="n">{counts[k]}</span>
          </button>
        ))}
      </div>

      <ol className="tl-list">
        {shown.map((i) => (
          <li key={`${i.kind}-${i.start}-${i.title}`} className={`tl-item k-${i.kind}`}>
            <span className="tl-marker" aria-hidden="true" />
            <div className="tl-card card">
              <div className="tl-top">
                <span className="tl-kind">{labels[i.kind]}</span>
                <span className="tl-when">{i.when}</span>
              </div>
              <h3>{i.title}</h3>
              <p className="tl-org">{i.org}</p>
              {i.detail && <p className="tl-detail">{i.detail}</p>}
              {i.points && (
                <ul>
                  {i.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
