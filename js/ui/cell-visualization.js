import { clamp } from '../utils/math.js';
import { observeResize } from '../utils/compat.js';

export class CellVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.unobserve = observeResize(canvas, this.draw.bind(this));
  }

  update(state) {
    this.state = state;
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width, h = rect.height;
    const s = this.state || { soc: 0.8, xn: 0.6, xp: 0.5, currentA: 0, negativeLithiation: 0.8, positiveLithiation: 0.2, temperatureC: 25 };
    const compact = w < 430;
    const margin = compact ? 14 : 22;
    const top = compact ? 46 : 52;
    const bottom = 30;
    const bodyH = Math.max(80, h - top - bottom);
    const negW = w * (compact ? 0.33 : 0.34);
    const sepW = w * 0.09;
    const posW = w * (compact ? 0.33 : 0.34);
    const gap = Math.max(5, (w - margin * 2 - negW - sepW - posW) / 2);
    const xNeg = margin;
    const xSep = xNeg + negW + gap;
    const xPos = xSep + sepW + gap;
    const depth = compact ? 6 : 9;

    drawAmbientGlow(ctx, w, h, s.temperatureC);
    drawExtrudedLayer(ctx, xNeg, top, negW, bodyH, depth, '#334155', '#64748b', s.negativeLithiation, 'neg');
    drawExtrudedLayer(ctx, xSep, top, sepW, bodyH, depth, '#0f172a', '#94a3b8', 0.35, 'sep');
    drawExtrudedLayer(ctx, xPos, top, posW, bodyH, depth, '#164e63', '#22d3ee', s.positiveLithiation, 'pos');

    ctx.font = '600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d7e2e8';
    ctx.fillText('Graphite', xNeg + negW / 2, 19);
    ctx.fillText('Separator', xSep + sepW / 2, 19);
    ctx.fillText('Cathode', xPos + posW / 2, 19);

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(148,163,184,.84)';
    ctx.fillText('xₙ ' + Number(s.xn || 0).toFixed(3), xNeg + negW / 2, 36);
    ctx.fillText('xₚ ' + Number(s.xp || 0).toFixed(3), xPos + posW / 2, 36);

    const direction = s.currentA > 0.03 ? 1 : (s.currentA < -0.03 ? -1 : 0);
    const progress = ((s.timeS || 0) % 4) / 4;
    const particleCount = compact ? 14 : 22;
    for (let i = 0; i < particleCount; i += 1) {
      const row = i % 7;
      const col = Math.floor(i / 7);
      const base = (row + 0.5) / 7;
      let p = (base + progress * (direction || 0.15) + col * 0.11) % 1;
      if (p < 0) p += 1;
      const x = xNeg + negW * 0.82 + p * (xPos - xNeg - negW * 0.62);
      const y = top + bodyH * (0.13 + 0.72 * ((i * 37) % 19) / 18);
      const radius = 2.3 + (i % 3) * 0.45;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(165,243,252,.9)';
      ctx.shadowBlur = 7;
      ctx.shadowColor = 'rgba(103,232,249,.45)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    drawElectronPath(ctx, xNeg, xPos + posW, top - 7, direction, progress);
    drawIonDirection(ctx, xNeg + 16, xPos + posW - 16, h - 13, direction);
  }
}

function drawAmbientGlow(ctx, w, h, temperatureC) {
  const hot = clamp((temperatureC - 25) / 35, 0, 1);
  const gradient = ctx.createRadialGradient(w * 0.52, h * 0.55, 20, w * 0.52, h * 0.55, Math.max(w, h) * 0.72);
  gradient.addColorStop(0, hot > 0.55 ? 'rgba(251,146,60,.12)' : 'rgba(34,211,238,.08)');
  gradient.addColorStop(1, 'rgba(7,16,23,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawExtrudedLayer(ctx, x, y, w, h, depth, base, active, fraction, kind) {
  const d = depth;
  const topFace = [[x, y], [x + d, y - d], [x + w + d, y - d], [x + w, y]];
  const sideFace = [[x + w, y], [x + w + d, y - d], [x + w + d, y + h - d], [x + w, y + h]];

  polygon(ctx, topFace, shade(base, 1.28), 'rgba(226,232,240,.18)');
  polygon(ctx, sideFace, shade(base, 0.72), 'rgba(226,232,240,.16)');

  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.23 + 0.67 * clamp(fraction, 0, 1);
  ctx.fillStyle = active;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(226,232,240,.24)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const pores = kind === 'sep' ? 20 : 38;
  ctx.fillStyle = kind === 'sep' ? 'rgba(226,232,240,.15)' : 'rgba(15,23,42,.42)';
  for (let i = 0; i < pores; i += 1) {
    const px = x + 6 + ((i * 47) % Math.max(8, Math.floor(w - 12)));
    const py = y + 6 + ((i * 31) % Math.max(8, Math.floor(h - 12)));
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (i % 3) * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind !== 'sep') {
    const bandY = y + h * (1 - clamp(fraction, 0, 1));
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x + 4, bandY); ctx.lineTo(x + w - 4, bandY); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function polygon(ctx, points, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function shade(hex, factor) {
  const raw = hex.replace('#', '');
  const num = parseInt(raw, 16);
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((num & 255) * factor)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawElectronPath(ctx, x0, x1, y, direction, progress) {
  ctx.save();
  ctx.strokeStyle = 'rgba(248,250,252,.24)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const span = x1 - x0;
  for (let i = 0; i < 5; i += 1) {
    let p = (i / 5 + progress * (direction || 0.12)) % 1;
    if (direction < 0) p = 1 - p;
    const x = x0 + span * p;
    ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(248,250,252,.82)'; ctx.fill();
  }
  ctx.restore();
}

function drawIonDirection(ctx, left, right, y, direction) {
  ctx.save();
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(148,163,184,.72)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Li+', (left + right) / 2, y);
  if (direction) {
    const from = direction > 0 ? left : right;
    const to = direction > 0 ? right : left;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(from, y); ctx.lineTo(to, y); ctx.stroke();
    const sign = to > from ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(to, y); ctx.lineTo(to - 7 * sign, y - 4); ctx.lineTo(to - 7 * sign, y + 4); ctx.closePath();
    ctx.fillStyle = '#67e8f9';
    ctx.fill();
  }
  ctx.restore();
}
