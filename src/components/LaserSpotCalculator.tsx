import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { performErfFit, performGaussianFit } from '@/lib/knife-edge';
import {
  drawPlot,
  exportBeamReport,
  type BeamPlot,
  type Metric,
} from '@/lib/beam-report';
import '@/styles/laser-spot.css';

type Scan = { name: string; x: number[]; y: number[] };
function parseScan(text: string, name: string): Scan {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  const rows = parsed.data;
  if (
    rows.length &&
    rows[0].slice(0, 2).every((s) => s.trim() && !Number.isFinite(Number(s)))
  )
    rows.shift();
  const points = rows
    .map((r, i) => {
      if (
        r.length < 2 ||
        r.slice(0, 2).some((s) => !s.trim() || !Number.isFinite(Number(s)))
      )
        throw new Error(
          'Check position and power in data row ' + (i + 1) + '.',
        );
      return [Number(r[0]), Number(r[1])];
    })
    .sort((a, b) => a[0] - b[0]);
  if (points.length < 5)
    throw new Error('Both fits need at least five distinct positions.');
  if (points.some(([x], i) => i > 0 && x === points[i - 1][0]))
    throw new Error(
      'Duplicate positions prevent differentiation. Average repeated measurements at each position first.',
    );
  if (points.every((p) => p[1] === points[0][1]))
    throw new Error('The power is constant across this scan.');
  return { name, x: points.map((p) => p[0]), y: points.map((p) => p[1]) };
}
function Plot({ plot }: { plot: BeamPlot }) {
  const ref = useRef<HTMLCanvasElement>(null),
    [read, setRead] = useState('');
  useEffect(() => {
    if (ref.current) drawPlot(ref.current, plot);
  }, [plot]);
  return (
    <figure>
      <figcaption>{plot.title}</figcaption>
      <canvas
        ref={ref}
        role="img"
        aria-label={plot.title + ' versus ' + plot.xLabel}
        onPointerLeave={() => setRead('')}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect(),
            fraction = (((e.clientX - box.left) * 520) / box.width - 76) / 418;
          const target =
            plot.x[0] + fraction * (plot.x[plot.x.length - 1] - plot.x[0]);
          const i = plot.x.reduce(
            (best, x, j) =>
              Math.abs(x - target) < Math.abs(plot.x[best] - target) ? j : best,
            0,
          );
          setRead(
            [
              plot.xLabel + ' ' + plot.x[i].toPrecision(4),
              ...plot.series.map(
                (s) => s.name + ' ' + s.values[i].toPrecision(4),
              ),
            ].join(' · '),
          );
        }}
      />
      <small>{read}</small>
    </figure>
  );
}
function Metrics({ title, rows }: { title: string; rows: Metric[] }) {
  return (
    <section>
      <h4>{title}</h4>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
const fmt = (v: number, u = '') =>
  (Number.isFinite(v) ? Number(v.toPrecision(6)).toString() : '∞') +
  (u ? ' ' + u : '');
export default function LaserSpotCalculator() {
  const [scan, setScan] = useState<Scan | null>(null),
    [error, setError] = useState(''),
    [tab, setTab] = useState('Results');
  const [xu, setX] = useState('mm'),
    [yu, setY] = useState('mW'),
    [win, setWin] = useState('11'),
    [poly, setPoly] = useState('3');
  const upload = useRef(0);
  const analysis = useMemo(() => {
    if (!scan) return null;
    const w = Number(win),
      p = Number(poly);
    if (
      !Number.isInteger(w) ||
      w < 3 ||
      w % 2 === 0 ||
      !Number.isInteger(p) ||
      p < 1 ||
      p >= w - 1
    )
      return {
        error:
          'Choose an odd SG window of at least 3 and a polynomial order between 1 and window − 2.',
      };
    try {
      const e = performErfFit(scan.x, scan.y);
      const g = performGaussianFit(scan.x, scan.y, w, p, e.success ? e.w : 0);
      return { e, g };
    } catch (err) {
      return { error: String(err) };
    }
  }, [scan, win, poly]);
  const e = analysis?.e,
    g = analysis?.g;
  const first: Metric[] = [],
    second: Metric[] = [],
    agreement: Metric[] = [],
    plots: BeamPlot[] = [];
  const slope = yu + '/' + xu,
    xLabel = 'Position (' + xu + ')';
  if (scan && e && g) {
    const direct: BeamPlot = {
      title: 'Direct error-function fit',
      x: scan.x,
      xLabel,
      yLabel: 'Power (' + yu + ')',
      series: [{ name: 'Measured power', values: scan.y, points: true }],
    };
    const derivative: BeamPlot = {
      title: 'Derivative and Gaussian fit',
      x: g.xMid,
      xLabel,
      yLabel: 'dP/dx (' + slope + ')',
      series: [
        { name: 'Raw derivative', values: g.dy },
        {
          name: g.dySmooth === g.dy ? 'Unsmoothed' : 'SG smoothed',
          values: g.dySmooth,
        },
      ],
    };
    plots.push(direct, derivative);
    if (e.success) {
      first.push(
        ['Offset', fmt(e.popt[0], yu)],
        ['Amplitude', fmt(e.popt[1], yu)],
        ['Center x₀', fmt(e.x0, xu)],
        ['Radius w', fmt(e.w, xu)],
        ['Diameter 2w', fmt(e.diameter, xu)],
        ['R²', fmt(e.r2)],
      );
      direct.center = e.x0;
      direct.series.push({ name: 'Erf fit', values: e.yPred });
      plots.push({
        title: 'Error-function residuals',
        x: scan.x,
        xLabel,
        yLabel: 'Residual (' + yu + ')',
        series: [
          {
            name: 'Measured − fit',
            values: scan.y.map((v, i) => v - e.yPred[i]),
            points: true,
          },
        ],
      });
    } else first.push(['Fit failed', e.error]);
    if (g.success) {
      second.push(
        ['Peak amplitude', fmt(g.popt[0], slope)],
        ['Center x₀', fmt(g.x0, xu)],
        ['σ', fmt(g.sigma, xu)],
        ['FWHM', fmt(g.fwhm, xu)],
        ['Radius w', fmt(g.w, xu)],
        ['Diameter 2w', fmt(g.diameter, xu)],
        [
          'SG noise (RMS)',
          g.dySmooth === g.dy
            ? 'Smoothing unavailable'
            : fmt(g.noiseRms, slope),
        ],
        [
          'Signal-to-noise ratio',
          g.dySmooth === g.dy ? 'Unavailable' : fmt(g.snr),
        ],
        ['R²', fmt(g.r2)],
      );
      derivative.center = g.x0;
      derivative.series.push({ name: 'Gaussian fit', values: g.yPred });
      plots.push({
        title: 'Gaussian residuals',
        x: g.xMid,
        xLabel,
        yLabel: 'Residual (' + slope + ')',
        series: [
          {
            name: 'Smoothed − fit',
            values: g.dySmooth.map((v, i) => v - g.yPred[i]),
            points: true,
          },
        ],
      });
    } else second.push(['Fit failed', g.error]);
    if (e.success && g.success) {
      const diff = Math.abs(e.diameter - g.diameter),
        pct = (200 * diff) / (e.diameter + g.diameter);
      agreement.push(
        ['Erf diameter', fmt(e.diameter, xu)],
        ['Gaussian diameter', fmt(g.diameter, xu)],
        ['Absolute difference', fmt(diff, xu)],
        ['Relative difference', fmt(pct, '%')],
        ['Agreement within 5%', pct < 5 ? 'Yes' : 'No'],
      );
    }
  }
  async function save(format: 'PNG' | 'PDF') {
    if (!scan) return;
    try {
      await exportBeamReport(
        format,
        scan.name,
        'SG window ' + win + ' · polynomial order ' + poly,
        [
          ...agreement,
          ...first.map(([k, v]): Metric => ['Erf · ' + k, v]),
          ...second.map(([k, v]): Metric => ['Gaussian · ' + k, v]),
        ],
        plots,
      );
    } catch (err) {
      setError('Could not export report. ' + String(err));
    }
  }
  return (
    <div className="beam-tool card">
      <div className="beam-inputs">
        <label>
          Knife-edge CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              const ticket = ++upload.current;
              ev.target.value = '';
              setScan(null);
              setError('');
              try {
                const next = parseScan(await file.text(), file.name);
                if (ticket === upload.current) setScan(next);
              } catch (err) {
                if (ticket === upload.current)
                  setError(err instanceof Error ? err.message : String(err));
              }
            }}
          />
        </label>
        <label>
          Position unit
          <input value={xu} onChange={(ev) => setX(ev.target.value)} />
        </label>
        <label>
          Power unit
          <input value={yu} onChange={(ev) => setY(ev.target.value)} />
        </label>
        <label>
          SG window
          <input
            type="number"
            min="3"
            step="2"
            value={win}
            onChange={(ev) => setWin(ev.target.value)}
          />
        </label>
        <label>
          SG polynomial order
          <input
            type="number"
            min="1"
            value={poly}
            onChange={(ev) => setPoly(ev.target.value)}
          />
        </label>
      </div>
      {(error || analysis?.error) && (
        <p role="alert">{error || analysis?.error}</p>
      )}
      {scan && e && g && (
        <>
          <div className="beam-bar">
            <strong>
              {scan.name} · {scan.x.length} positions
            </strong>
            <div>
              {['Results', 'Plots'].map((t) => (
                <button
                  key={t}
                  aria-pressed={t === tab}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div>
              {(['PNG', 'PDF'] as const).map((f) => (
                <button key={f} onClick={() => save(f)}>
                  Export {f}
                </button>
              ))}
            </div>
          </div>
          {tab === 'Results' ? (
            <div className="beam-grid">
              {agreement.length > 0 && (
                <Metrics title="Diameter comparison" rows={agreement} />
              )}
              <Metrics title="Direct error-function fit" rows={first} />
              <Metrics title="Derivative Gaussian fit" rows={second} />
            </div>
          ) : (
            <div className="beam-plots">
              {plots.map((plot) => (
                <Plot key={plot.title} plot={plot} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
