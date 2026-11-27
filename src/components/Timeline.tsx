import { useMemo, useState } from 'react';
import type { TimelineItem, TimelineKind } from '@/data/cv';

type Props = { items: TimelineItem[]; labels: Record<TimelineKind, string> };

export default function Timeline({ items, labels }: Props) {
  const kinds = Object.keys(labels) as TimelineKind[];
  // One category at a time; null = everything. Clicking the selected category again goes back to everything.
  const [selected, setSelected] = useState<TimelineKind | null>(null);

  const shown = useMemo(
    () => items.filter((i) => !selected || i.kind === selected).sort((a, b) => b.start.localeCompare(a.start)),
    [items, selected],
  );
  const counts = useMemo(() => Object.fromEntries(kinds.map((k) => [k, items.filter((i) => i.kind === k).length])), [items]);

  return (
    <div className="tl">
      <div className="tl-filters" role="group" aria-label="Show timeline categories">
        <button type="button" className={`tl-all ${selected === null ? 'on' : ''}`} aria-pressed={selected === null} onClick={() => setSelected(null)}>
          Everything
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`tl-chip k-${k} ${selected === k ? 'on' : ''}`}
            aria-pressed={selected === k}
            onClick={() => setSelected(selected === k ? null : k)}
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
