export interface BeamPlot {
  title: string;
  x: number[];
  series: { name: string; values: number[]; points?: boolean }[];
  xLabel: string;
  yLabel: string;
  center?: number;
}
export type Metric = [string, string];
const colors = ['#30598c', '#b64b25', '#176b53'];

export function drawPlot(canvas: HTMLCanvasElement, plot: BeamPlot) {
  const c = canvas.getContext('2d')!;
  canvas.width = 1040;
  canvas.height = 640;
  c.scale(2, 2);
  c.fillStyle = '#fff';
  c.fillRect(0, 0, 520, 320);
  const left = 76,
    right = 494,
    top = 28,
    bottom = 226;
  const xmin = plot.x[0],
    xmax = plot.x[plot.x.length - 1];
  let ymin = Infinity,
    ymax = -Infinity;
  for (const series of plot.series)
    for (const y of series.values) {
      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);
    }
  const pad = (ymax - ymin || Math.abs(ymax) || 1) * 0.06;
  ymin -= pad;
  ymax += pad;
  const px = (x: number) =>
    left + ((right - left) * (x - xmin)) / (xmax - xmin);
  const py = (y: number) =>
    bottom - ((bottom - top) * (y - ymin)) / (ymax - ymin);
  function line(x: number, y: number, u: number, v: number) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(u, v);
    c.stroke();
  }
  c.font = '13px sans-serif';
  c.fillStyle = '#28364b';
  for (let i = 0; i <= 4; i++) {
    const frac = i / 4,
      x = left + frac * (right - left),
      y = bottom - frac * (bottom - top);
    c.strokeStyle = '#dce3eb';
    line(left, y, right, y);
    c.textAlign = 'right';
    c.fillText(
      Number((ymin + frac * (ymax - ymin)).toPrecision(3)).toString(),
      left - 6,
      y + 4,
    );
    c.textAlign = 'center';
    c.fillText(
      Number((xmin + frac * (xmax - xmin)).toPrecision(4)).toString(),
      x,
      bottom + 18,
    );
  }
  c.textAlign = 'left';
  c.fillText(plot.yLabel, 6, 17);
  c.textAlign = 'center';
  c.fillText(plot.xLabel, (left + right) / 2, bottom + 40);
  if (plot.center !== undefined && plot.center >= xmin && plot.center <= xmax) {
    c.strokeStyle = '#6b7280';
    c.setLineDash([4, 4]);
    line(px(plot.center), top, px(plot.center), bottom);
    c.setLineDash([]);
  }
  let legendX = 14;
  plot.series.forEach((s, i) => {
    c.fillStyle = c.strokeStyle = colors[i];
    c.lineWidth = 1.7;
    c.beginPath();
    s.values.forEach((y, j) => {
      const x = px(plot.x[j]),
        v = py(y);
      if (s.points) {
        c.moveTo(x + 2, v);
        c.arc(x, v, 2, 0, 2 * Math.PI);
      } else if (j === 0) c.moveTo(x, v);
      else c.lineTo(x, v);
    });
    if (s.points) c.fill();
    else c.stroke();
    line(legendX, 292, legendX + 15, 292);
    c.textAlign = 'left';
    c.fillText(s.name, legendX + 20, 296);
    legendX += c.measureText(s.name).width + 37;
  });
}

export async function exportBeamReport(
  format: 'PNG' | 'PDF',
  name: string,
  settings: string,
  metrics: Metric[],
  plots: BeamPlot[],
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1300;
  canvas.height = 190 + metrics.length * 27 + Math.ceil(plots.length / 2) * 440;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#152841';
  c.font = 'bold 38px sans-serif';
  c.fillText('Laser spot size · knife-edge analysis', 44, 58);
  c.font = '22px sans-serif';
  c.fillText(name, 44, 98, 1200);
  c.fillText(settings, 44, 134, 1200);
  metrics.forEach(([label, value], i) => {
    const y = 182 + i * 27;
    c.fillText(label, 44, y);
    c.fillText(value, 700, y, 550);
  });
  const start = 218 + metrics.length * 27;
  plots.forEach((plot, i) => {
    const x = 28 + (i % 2) * 630,
      y = start + Math.floor(i / 2) * 440;
    c.font = 'bold 22px sans-serif';
    c.fillText(plot.title, x + 10, y);
    const chart = document.createElement('canvas');
    drawPlot(chart, plot);
    c.drawImage(chart, x, y + 12, 618, 380);
  });
  if (format === 'PDF') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: [650, canvas.height / 2] });
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      650,
      canvas.height / 2,
    );
    pdf.save('beam-analysis-report.pdf');
  } else {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) =>
        b ? resolve(b) : reject(new Error('PNG export failed.')),
      ),
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'beam-analysis-report.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
