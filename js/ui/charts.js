import { observeResize } from '../utils/compat.js';

const palette = ['#67e8f9', '#f8fafc', '#a3e635', '#fbbf24'];

export class LineChart {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.data = { x: [], series: [] };
    this.cursor = 0;
    this.unobserve = observeResize(canvas, this.draw.bind(this));
  }

  setData(x, series, options) {
    this.data = { x: x, series: series };
    Object.assign(this.options, options || {});
    this.cursor = Math.min(this.cursor, Math.max(0, x.length - 1));
    this.draw();
  }

  setCursor(index) {
    this.cursor = index;
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: w < 420 ? 46 : 54, r: 16, t: 34, b: 34 };
    const plotW = Math.max(1, w - pad.l - pad.r);
    const plotH = Math.max(1, h - pad.t - pad.b);
    const x = this.data.x;
    const series = this.data.series;
    if (!x.length || !series.length) return;

    const allY = [];
    for (let sIndex = 0; sIndex < series.length; sIndex += 1) {
      const values = series[sIndex].values;
      for (let i = 0; i < values.length; i += 1) {
        if (Number.isFinite(values[i])) allY.push(values[i]);
      }
    }
    if (!allY.length) return;

    let yMin = this.options.yMin !== undefined ? this.options.yMin : Math.min.apply(null, allY);
    let yMax = this.options.yMax !== undefined ? this.options.yMax : Math.max.apply(null, allY);
    if (Math.abs(yMax - yMin) < 1e-12) { yMax += 1; yMin -= 1; }
    const margin = (yMax - yMin) * 0.08;
    if (this.options.yMin === undefined) yMin -= margin;
    if (this.options.yMax === undefined) yMax += margin;

    const xMin = x[0];
    const xMax = x[x.length - 1] || 1;
    const px = function (value) { return pad.l + (value - xMin) / Math.max(1e-9, xMax - xMin) * plotW; };
    const py = function (value) { return pad.t + (yMax - value) / Math.max(1e-9, yMax - yMin) * plotH; };

    ctx.strokeStyle = 'rgba(148,163,184,.16)';
    ctx.fillStyle = 'rgba(203,213,225,.76)';
    ctx.lineWidth = 1;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gridIndex = 0; gridIndex <= 4; gridIndex += 1) {
      const yv = yMin + (yMax - yMin) * gridIndex / 4;
      const y = py(yv);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillText(formatTick(yv), pad.l - 7, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let timeIndex = 0; timeIndex <= 4; timeIndex += 1) {
      const xv = xMin + (xMax - xMin) * timeIndex / 4;
      const xx = px(xv);
      ctx.fillText(formatTime(xv), xx, h - pad.b + 9);
    }

    for (let sIndex = 0; sIndex < series.length; sIndex += 1) {
      const s = series[sIndex];
      ctx.strokeStyle = s.color || palette[sIndex % palette.length];
      ctx.lineWidth = s.width || 1.8;
      ctx.beginPath();
      const stride = Math.max(1, Math.floor(x.length / Math.max(900, plotW * 2)));
      let started = false;
      for (let pointIndex = 0; pointIndex < x.length; pointIndex += stride) {
        const yv = s.values[pointIndex];
        if (!Number.isFinite(yv)) continue;
        const xx = px(x[pointIndex]), yy = py(yv);
        if (!started) { ctx.moveTo(xx, yy); started = true; }
        else ctx.lineTo(xx, yy);
      }
      const lastIndex = x.length - 1;
      if (lastIndex % stride !== 0 && Number.isFinite(s.values[lastIndex])) ctx.lineTo(px(x[lastIndex]), py(s.values[lastIndex]));
      ctx.stroke();
    }

    const ci = Math.max(0, Math.min(Math.round(this.cursor), x.length - 1));
    const cx = px(x[ci]);
    ctx.strokeStyle = 'rgba(248,250,252,.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b); ctx.stroke();
    ctx.setLineDash([]);

    let legendX = pad.l;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    for (let sIndex = 0; sIndex < series.length; sIndex += 1) {
      const s = series[sIndex];
      ctx.fillStyle = s.color || palette[sIndex % palette.length];
      ctx.fillRect(legendX, 10, 14, 2);
      ctx.fillStyle = 'rgba(226,232,240,.88)';
      ctx.fillText(s.label, legendX + 20, 11);
      legendX += Math.min(160, ctx.measureText(s.label).width + 44);
    }
  }
}

function formatTime(seconds) {
  if (seconds >= 3600) return (seconds / 3600).toFixed(1) + 'h';
  if (seconds >= 120) return Math.round(seconds / 60) + 'm';
  return Math.round(seconds) + 's';
}

function formatTick(v) {
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
