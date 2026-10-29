import { useId, useMemo, useState } from 'react';
import { rta, type RTA } from '@/lib/tmm';

type Phase = { n: number; k: number };

// Substrate presets at λ = 1550 nm.
// Fused silica: Malitson, J. Opt. Soc. Am. 55, 1205 (1965) → n ≈ 1.444.
// Silicon: Li, J. Phys. Chem. Ref. Data 9, 561 (1980) → n ≈ 3.476 (room temperature).
const SUBSTRATES = {
  sio2: { label: 'Fused silica (SiO₂)', n: 1.444, k: 0 },
  si: { label: 'Silicon (Si)', n: 3.476, k: 0 },
} as const;
type SubKey = keyof typeof SUBSTRATES;

const W = 640, H = 300, PAD = { l: 52, r: 16, t: 16, b: 44 };
const D_MAX = 300; // nm
const STEPS = 301;

const x = (d: number) => PAD.l + (d / D_MAX) * (W - PAD.l - PAD.r);
const y = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);

function path(points: number[]) {
  return points.map((v, i) => `${i ? 'L' : 'M'}${x((i * D_MAX) / (STEPS - 1)).toFixed(1)},${y(v).toFixed(1)}`).join('');
}

function NumberField(props: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <label className="tmm-field" htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={props.value}
        step={props.step}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) props.onChange(Math.min(props.max, Math.max(props.min, v)));
        }}
      />
    </label>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function TmmDemo() {
  const [lambda, setLambda] = useState(1550);
  const [sub, setSub] = useState<SubKey>('sio2');
  const [am, setAm] = useState<Phase>({ n: 3.9, k: 0.05 });
  const [cr, setCr] = useState<Phase>({ n: 6.1, k: 0.8 });
  const [d, setD] = useState(80);
  const s = SUBSTRATES[sub];

  const curves = useMemo(() => {
    const ra: number[] = [], rc: number[] = [];
    for (let i = 0; i < STEPS; i++) {
      const t = (i * D_MAX) / (STEPS - 1);
      ra.push(rta(lambda, [{ ...am, d: t }], 1, s.n, s.k).R);
      rc.push(rta(lambda, [{ ...cr, d: t }], 1, s.n, s.k).R);
    }
    return { ra, rc };
  }, [lambda, am, cr, s]);

  const atD: { a: RTA; c: RTA } = useMemo(
    () => ({ a: rta(lambda, [{ ...am, d }], 1, s.n, s.k), c: rta(lambda, [{ ...cr, d }], 1, s.n, s.k) }),
    [lambda, am, cr, s, d],
  );

  const best = useMemo(() => {
    let bi = 0, bv = -1;
    curves.ra.forEach((v, i) => { const dv = Math.abs(curves.rc[i] - v); if (dv > bv) { bv = dv; bi = i; } });
    return { d: (bi * D_MAX) / (STEPS - 1), dR: bv };
  }, [curves]);

  const ticksX = [0, 50, 100, 150, 200, 250, 300];
  const ticksY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="tmm">
      <div className="tmm-controls">
        <fieldset>
          <legend>Wavelength & substrate</legend>
          <NumberField label="λ (nm)" value={lambda} step={10} min={300} max={20000} onChange={setLambda} />
          <label className="tmm-field">
            <span>Substrate</span>
            <select value={sub} onChange={(e) => setSub(e.target.value as SubKey)}>
              {Object.entries(SUBSTRATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <p className="tmm-note">Substrate indices are for 1550 nm; change λ only together with matching n, k.</p>
        </fieldset>
        <fieldset>
          <legend><span className="sw sw-a" aria-hidden="true" /> Amorphous PCM</legend>
          <NumberField label="n" value={am.n} step={0.01} min={1} max={10} onChange={(n) => setAm({ ...am, n })} />
          <NumberField label="k" value={am.k} step={0.01} min={0} max={10} onChange={(k) => setAm({ ...am, k })} />
        </fieldset>
        <fieldset>
          <legend><span className="sw sw-c" aria-hidden="true" /> Crystalline PCM</legend>
          <NumberField label="n" value={cr.n} step={0.01} min={1} max={10} onChange={(n) => setCr({ ...cr, n })} />
          <NumberField label="k" value={cr.k} step={0.01} min={0} max={10} onChange={(k) => setCr({ ...cr, k })} />
        </fieldset>
      </div>

      <figure className="tmm-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Reflectance versus PCM thickness at ${lambda} nm for amorphous and crystalline phases`}>
          {ticksY.map((t) => (
            <g key={`y${t}`}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
              <text className="tick" x={PAD.l - 8} y={y(t) + 4} textAnchor="end">{t.toFixed(2)}</text>
            </g>
          ))}
          {ticksX.map((t) => (
            <text key={`x${t}`} className="tick" x={x(t)} y={H - PAD.b + 18} textAnchor="middle">{t}</text>
          ))}
          <text className="axis" x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle">PCM thickness d (nm)</text>
          <text className="axis" transform={`translate(14 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle">Reflectance R</text>
          <path className="curve-a" d={path(curves.ra)} />
          <path className="curve-c" d={path(curves.rc)} />
          <line className="cursor" x1={x(d)} x2={x(d)} y1={PAD.t} y2={H - PAD.b} />
          <circle className="dot-a" cx={x(d)} cy={y(atD.a.R)} r={4.5} />
          <circle className="dot-c" cx={x(d)} cy={y(atD.c.R)} r={4.5} />
        </svg>
        <label className="tmm-slider">
          <span>Thickness d = <strong>{d} nm</strong></span>
          <input type="range" min={0} max={D_MAX} step={1} value={d} onChange={(e) => setD(Number(e.target.value))} aria-label="PCM thickness in nanometres" />
        </label>
      </figure>

      <div className="tmm-readout" aria-live="polite">
        <table>
          <thead><tr><th scope="col">Phase</th><th scope="col">R</th><th scope="col">T</th><th scope="col">A</th></tr></thead>
          <tbody>
            <tr><th scope="row"><span className="sw sw-a" aria-hidden="true" /> Amorphous</th><td>{pct(atD.a.R)}</td><td>{pct(atD.a.T)}</td><td>{pct(atD.a.A)}</td></tr>
            <tr><th scope="row"><span className="sw sw-c" aria-hidden="true" /> Crystalline</th><td>{pct(atD.c.R)}</td><td>{pct(atD.c.T)}</td><td>{pct(atD.c.A)}</td></tr>
          </tbody>
        </table>
        <p>
          Contrast at {d} nm: <strong>|ΔR| = {pct(Math.abs(atD.c.R - atD.a.R))}</strong>. Largest contrast in 0–{D_MAX} nm:{' '}
          <button type="button" className="tmm-link" onClick={() => setD(Math.round(best.d))}>{pct(best.dR)} at {Math.round(best.d)} nm</button>.
        </p>
      </div>
    </div>
  );
}
