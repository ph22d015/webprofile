import { useMemo, useState } from 'react';
import { calculateOpticalResponse, dispersion, number } from '@/lib/optistack';
import type {
  SweepParameter,
  DispersiveDataPoint,
  LayerMaterialProperties,
} from '@/lib/optistack-types';
import '@/styles/optistack.css';

type Material = {
  id: string;
  name: string;
  mode: 'constant' | 'dispersive';
  n: string;
  k: string;
  table: string;
};
const material = (id: string, name: string, n: string, k = '0'): Material => ({
  id,
  name,
  mode: 'constant',
  n,
  k,
  table: '',
});


function Chart({
  x,
  curves,
  axis,
  max,
}: {
  x: number[];
  curves: { name: string; y: number[] }[];
  axis: string;
  max: number;
}) {
  const left = 52,
    top = 14,
    width = 546,
    height = 180;
  const px = (v: number) =>
    left + (width * (v - x[0])) / (x[x.length - 1] - x[0]);
  const py = (v: number) => top + height * (1 - v / max);
  return (
    <figure>
      <svg
        viewBox="0 0 640 245"
        role="img"
        aria-label={curves.map((c) => c.name).join(', ') + ' versus ' + axis}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              x2={left + width}
              y1={py(f * max)}
              y2={py(f * max)}
            />
            <text x={left - 8} y={py(f * max) + 4} textAnchor="end">
              {Number((f * max).toPrecision(3))}
            </text>
            <text
              x={left + width * f}
              y={height + top + 20}
              textAnchor="middle"
            >
              {Number((x[0] + f * (x[x.length - 1] - x[0])).toPrecision(5))}
            </text>
          </g>
        ))}
        {curves.map((c, i) => (
          <polyline
            key={c.name}
            className={'line series' + i}
            points={c.y.map((y, j) => px(x[j]) + ',' + py(y)).join(' ')}
          />
        ))}
        <text x={left + width / 2} y="239" textAnchor="middle">
          {axis}
        </text>
      </svg>
      <figcaption>
        {curves.map((c, i) => (
          <span className={'key series' + i} key={c.name}>
            {c.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function Numeric({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => set(e.currentTarget.value)}
      />
    </label>
  );
}

export default function OptiStack() {
  const [materials, setMaterials] = useState([
    material('air', 'Air', '1'),
    material('film', 'Example film', '3.9', '0.05'),
    material('glass', 'Glass', '1.5'),
  ]);
  const [selected, select] = useState('film');
  const [incident, setIncident] = useState('air'),
    [substrate, setSubstrate] = useState('glass');
  const [layers, setLayers] = useState([
    { id: 'first', materialId: 'film', d: '200' },
  ]);
  const [sweep, setSweep] = useState<SweepParameter>('wavelength'),
    [pol, setPol] = useState<'TE' | 'TM'>('TE');
  const [range, setRange] = useState({
    minW: '1000',
    maxW: '2000',
    angle: '0',
    minA: '0',
    maxA: '80',
    wave: '1550',
  });
  const [cursor, setCursor] = useState(100),
    [fileError, setFileError] = useState('');
  const active = materials.find((m) => m.id === selected)!;
  function update(id: string, patch: Partial<Material>) {
    setMaterials((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  const options = materials.map((m) => (
    <option key={m.id} value={m.id}>
      {m.name || 'Unnamed material'}
    </option>
  ));
  const inUse =
    active.id === incident ||
    active.id === substrate ||
    layers.some((l) => l.materialId === active.id);
  const result = useMemo(() => {
    try {
      const names = new Set<string>();
      const library = materials.map((m) => {
        const name = m.name.trim().toLowerCase();
        if (!name || names.has(name))
          throw new Error('Give each material a distinct name.');
        names.add(name);
        const properties: LayerMaterialProperties =
          m.mode === 'constant'
            ? {
                type: 'constant',
                n: number(m.n, m.name + ' index', Number.MIN_VALUE),
                k: number(m.k, m.name + ' extinction coefficient'),
              }
            : { type: 'dispersive', data: dispersion(m.table) };
        return { id: m.id, properties };
      });
      // R/T are only defined for light arriving through a lossless medium.
      const inc = library.find((m) => m.id === incident)?.properties;
      if (inc && (inc.type === 'constant' ? inc.k > 0 : inc.data.some((p) => p.k > 0)))
        throw new Error('The incident medium must be lossless (k = 0).');
      const waveSweep = sweep === 'wavelength';
      const minWavelength = waveSweep
        ? number(range.minW, 'minimum wavelength', 1)
        : 1;
      const maxWavelength = waveSweep
        ? number(range.maxW, 'maximum wavelength', 1)
        : 2;
      const minAngle = waveSweep
        ? 0
        : number(range.minA, 'minimum angle', 0, 89.9);
      const maxAngle = waveSweep
        ? 1
        : number(range.maxA, 'maximum angle', 0, 89.9);
      if (minWavelength >= maxWavelength || minAngle >= maxAngle)
        throw new Error('The sweep end must exceed its start.');
      const fixedWavelength = waveSweep ? 1 : number(range.wave, 'fixed wavelength', 1);
      const [lo, hi] = waveSweep ? [minWavelength, maxWavelength] : [fixedWavelength, fixedWavelength];
      // Outside its table a material keeps its end values (see interpolateNK), so say so instead of plotting it silently.
      const used = new Set([incident, substrate, ...layers.map((l) => l.materialId)]);
      const notes = library.flatMap(({ id, properties: p }) => {
        if (p.type !== 'dispersive' || !used.has(id)) return [];
        const first = p.data[0].wavelength, last = p.data[p.data.length - 1].wavelength;
        if (lo >= first && hi <= last) return [];
        const name = materials.find((m) => m.id === id)!.name;
        return [`${name}: n, k held constant outside its table (${first}–${last} nm).`];
      });
      const { data } = calculateOpticalResponse({
        sweepType: sweep,
        polarization: pol,
        materialLibrary: library,
        incidentMediumMaterialId: incident,
        substrateMediumMaterialId: substrate,
        layerMaterials: layers,
        thickness: layers.map((l, i) =>
          number(l.d, 'layer ' + (i + 1) + ' thickness'),
        ),
        minWavelength,
        maxWavelength,
        minAngle,
        maxAngle,
        angleOfIncidence: waveSweep
          ? number(range.angle, 'fixed angle', 0, 89.9)
          : 0,
        wavelength: fixedWavelength,
      });
      return { data, notes };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Check the input values.',
      };
    }
  }, [materials, incident, substrate, layers, sweep, pol, range]);
  const axis = sweep === 'angle' ? 'Angle (°)' : 'Wavelength (nm)';
  function download() {
    if (!result.data) return;
    const csv = [
      axis + ',Reflectance,Transmittance,Absorptance',
      ...result.data.map((p) =>
        [p.xValue, p.reflectance, p.transmittance, p.absorptance].join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optistack-' + pol + '-' + sweep + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let preview: DispersiveDataPoint[] = [];
  if (active.mode === 'dispersive') {
    try {
      preview = dispersion(active.table);
    } catch {
      /* The result panel displays the validation message. */
    }
  }
  const point = result.data?.[cursor];
  return (
    <div className="optistack">
      <fieldset>
        <legend>Material library</legend>
        <div className="controls">
          <label>
            Material
            <select
              value={selected}
              onChange={(e) => {
                select(e.currentTarget.value);
                setFileError('');
              }}
            >
              {options}
            </select>
          </label>
          <button
            onClick={() => {
              const id = crypto.randomUUID();
              setMaterials([
                ...materials,
                material(id, 'Material ' + id.slice(0, 4), '1.5'),
              ]);
              select(id);
              setFileError('');
            }}
          >
            Add material
          </button>
          <button
            disabled={inUse || materials.length === 1}
            onClick={() => {
              const rest = materials.filter((m) => m.id !== selected);
              setMaterials(rest);
              select(rest[0].id);
              setFileError('');
            }}
          >
            Remove material
          </button>
        </div>
        <div className="controls">
          <label>
            Name
            <input
              value={active.name}
              onChange={(e) => update(selected, { name: e.currentTarget.value })}
            />
          </label>
          <label>
            Optical constants
            <select
              value={active.mode}
              onChange={(e) =>
                update(selected, { mode: e.currentTarget.value as Material['mode'] })
              }
            >
              <option value="constant">Constant n, k</option>
              <option value="dispersive">Tabulated n, k</option>
            </select>
          </label>
          {active.mode === 'constant' && (
            <>
              <Numeric
                label="Refractive index n"
                value={active.n}
                set={(n) => update(selected, { n })}
              />
              <Numeric
                label="Extinction coefficient k"
                value={active.k}
                set={(k) => update(selected, { k })}
              />
            </>
          )}
        </div>
        {active.mode === 'dispersive' && (
          <>
            <label>
              Wavelength (nm), n, k
              <textarea
                rows={4}
                value={active.table}
                placeholder={'1000, 3.9, 0.05\n2000, 3.8, 0.04'}
                onChange={(e) => {
                  update(selected, { table: e.currentTarget.value });
                  setFileError('');
                }}
              />
            </label>
            <label>
              Import CSV, TXT or DAT
              <input
                type="file"
                accept=".csv,.txt,.dat"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (file)
                    try {
                      const table = await file.text();
                      dispersion(table);
                      update(selected, { table });
                      setFileError('');
                    } catch (err) {
                      setFileError(String(err));
                    }
                }}
              />
            </label>
            {fileError && <p role="alert">{fileError}</p>}
            {preview.length > 0 && (
              <details>
                <summary>Plot material dispersion</summary>
                <Chart
                  axis="Wavelength (nm)"
                  x={preview.map((p) => p.wavelength)}
                  curves={['n', 'k'].map((k) => ({
                    name: k,
                    y: preview.map((p) => p[k as 'n' | 'k']),
                  }))}
                  max={preview.reduce((v, p) => Math.max(v, p.n, p.k), 1)}
                />
              </details>
            )}
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Optical stack</legend>
        <label>
          Incident medium
          <select
            value={incident}
            onChange={(e) => setIncident(e.currentTarget.value)}
          >
            {options}
          </select>
        </label>
        {layers.map((layer, i) => (
          <div className="controls layer" key={layer.id}>
            <label>
              Film {i + 1}
              <select
                value={layer.materialId}
                onChange={(e) =>
                  setLayers(
                    layers.map((l) =>
                      l.id === layer.id
                        ? { ...l, materialId: e.currentTarget.value }
                        : l,
                    ),
                  )
                }
              >
                {options}
              </select>
            </label>
            <Numeric
              label="Thickness (nm)"
              value={layer.d}
              set={(d) =>
                setLayers(
                  layers.map((l) => (l.id === layer.id ? { ...l, d } : l)),
                )
              }
            />
            <button
              aria-label={'Remove film ' + (i + 1)}
              onClick={() => setLayers(layers.filter((l) => l.id !== layer.id))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          disabled={layers.length >= 20}
          onClick={() =>
            setLayers([
              ...layers,
              { id: crypto.randomUUID(), materialId: selected, d: '100' },
            ])
          }
        >
          Add film
        </button>
        <label>
          Substrate
          <select
            value={substrate}
            onChange={(e) => setSubstrate(e.currentTarget.value)}
          >
            {options}
          </select>
        </label>
        <ol className="stack-diagram" aria-label="Stack in propagation order">
          <li>{materials.find((m) => m.id === incident)?.name} · incident</li>
          {layers.map((l) => (
            <li key={l.id}>
              {materials.find((m) => m.id === l.materialId)?.name} · {l.d} nm
            </li>
          ))}
          <li>{materials.find((m) => m.id === substrate)?.name} · substrate</li>
        </ol>
      </fieldset>
      <fieldset>
        <legend>Sweep</legend>
        <div className="controls">
          <label>
            Variable
            <select
              value={sweep}
              onChange={(e) => setSweep(e.currentTarget.value as SweepParameter)}
            >
              <option value="wavelength">Wavelength</option>
              <option value="angle">Incidence angle</option>
            </select>
          </label>
          <label>
            Polarization
            <select
              value={pol}
              onChange={(e) => setPol(e.currentTarget.value as 'TE' | 'TM')}
            >
              <option>TE</option>
              <option>TM</option>
            </select>
          </label>
          {(sweep === 'wavelength'
            ? [
                ['minW', 'Start (nm)'],
                ['maxW', 'End (nm)'],
                ['angle', 'Fixed angle (°)'],
              ]
            : [
                ['minA', 'Start (°)'],
                ['maxA', 'End (°)'],
                ['wave', 'Fixed wavelength (nm)'],
              ]
          ).map(([k, label]) => (
            <Numeric
              key={k}
              label={label}
              value={range[k as keyof typeof range]}
              set={(v) => setRange({ ...range, [k]: v })}
            />
          ))}
        </div>
      </fieldset>
      <section>
        <h3>Optical response</h3>
        {result.error && <p role="status">{result.error}</p>}
        {result.notes?.map((n) => <p role="status" key={n}>{n}</p>)}
        {result.data && point && (
          <>
            <Chart
              axis={axis}
              x={result.data.map((p) => p.xValue)}
              max={1}
              curves={(
                ['reflectance', 'transmittance', 'absorptance'] as const
              ).map((k) => ({ name: k, y: result.data.map((p) => p[k]) }))}
            />
            <label>
              Inspect sweep point
              <input
                type="range"
                min={0}
                max={result.data.length - 1}
                value={cursor}
                onChange={(e) => setCursor(+e.currentTarget.value)}
              />
            </label>
            <output>
              {point.xValue.toFixed(2)} {sweep === 'angle' ? '°' : 'nm'} · R{' '}
              {(100 * point.reflectance).toFixed(2)}% · T{' '}
              {(100 * point.transmittance).toFixed(2)}% · A{' '}
              {(100 * point.absorptance).toFixed(2)}%
            </output>
            <button onClick={download}>Download CSV</button>
          </>
        )}
      </section>
    </div>
  );
}
