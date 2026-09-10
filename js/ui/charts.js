const palette = ['#67e8f9', '#f8fafc', '#a3e635', '#fbbf24'];

export class LineChart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.data = { x: [], series: [] };
    this.cursor = 0;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
  }

  setData(x, series, options = {}) {
    this.data = { x, series };
    Object.assign(this.options, options);
    this.cursor = Math.min(this.cursor, Math.max(0, x.length - 1));
    this.draw();
  }

  setCursor(index) {
    this.cursor = index;
    this.draw();
  }

  draw() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 48, r: 16, t: 30, b: 30 };
    const plotW = Math.max(1, w - pad.l - pad.r);
    const plotH = Math.max(1, h - pad.t - pad.b);
    const { x, series } = this.data;
    if (!x.length || !series.length) return;

    const allY = series.flatMap(s => s.values.filter(Number.isFinite));
    if (!allY.length) return;
    let yMin = this.options.yMin ?? Math.min(...allY);
    let yMax = this.options.yMax ?? Math.max(...allY);
    if (Math.abs(yMax - yMin) < 1e-12) { yMax += 1; yMin -= 1; }
    const margin = (yMax - yMin) * 0.08;
    if (this.options.yMin === undefined) yMin -= margin;
    if (this.options.yMax === undefined) yMax += margin;
    const xMin = x[0], xMax = x.at(-1) || 1;
    const px = value => pad.l + (value - xMin) / Math.max(1e-9, xMax - xMin) * plotW;
    const py = value => pad.t + (yMax - value) / Math.max(1e-9, yMax - yMin) * plotH;

    ctx.strokeStyle = 'rgba(148,163,184,.16)';
    ctx.fillStyle = 'rgba(203,213,225,.72)';
    ctx.lineWidth = 1;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const yv = yMin + (yMax - yMin) * i / 4;
      const y = py(yv);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillText(formatTick(yv), pad.l - 7, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const xv = xMin + (xMax - xMin) * i / 4;
      const xx = px(xv);
      ctx.fillText(formatTime(xv), xx, h - pad.b + 8);
    }

    series.forEach((s, idx) => {
      ctx.strokeStyle = s.color || palette[idx % palette.length];
      ctx.lineWidth = s.width || 1.7;
      ctx.beginPath();
      const stride = Math.max(1, Math.floor(x.length / Math.max(900, plotW * 2)));
      let started = false;
      for (let i = 0; i < x.length; i += stride) {
        const yv = s.values[i];
        if (!Number.isFinite(yv)) continue;
        const xx = px(x[i]), yy = py(yv);
        if (!started) { ctx.moveTo(xx, yy); started = true; } else ctx.lineTo(xx, yy);
      }
      if ((x.length - 1) % stride !== 0 && Number.isFinite(s.values.at(-1))) ctx.lineTo(px(x.at(-1)), py(s.values.at(-1)));
      ctx.stroke();
    });

    const ci = Math.max(0, Math.min(this.cursor, x.length - 1));
    const cx = px(x[ci]);
    ctx.strokeStyle = 'rgba(248,250,252,.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b); ctx.stroke();
    ctx.setLineDash([]);

    let legendX = pad.l;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '11px system-ui, sans-serif';
    series.forEach((s, idx) => {
      ctx.fillStyle = s.color || palette[idx % palette.length];
      ctx.fillRect(legendX, 8, 14, 2);
      ctx.fillStyle = 'rgba(226,232,240,.85)';
      ctx.fillText(s.label, legendX + 20, 9);
      legendX += Math.min(150, ctx.measureText(s.label).width + 42);
    });
  }
}

function formatTime(seconds) {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 120) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds)}s`;
}
function formatTick(v) {
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
