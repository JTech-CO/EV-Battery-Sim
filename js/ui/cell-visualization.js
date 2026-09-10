import { clamp } from '../utils/math.js';

export class CellVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
  }
  update(state) { this.state = state; this.draw(); }
  draw() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    const ctx = this.ctx; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
    const w = rect.width, h = rect.height;
    const s = this.state || { soc:.8, xn:.6, xp:.5, currentA:0, negativeLithiation:.8, positiveLithiation:.2, temperatureC:25 };
    const margin = 18, top = 34, bottom = 22;
    const bodyH = h - top - bottom;
    const negW = w * .34, sepW = w * .10, posW = w * .34;
    const gap = (w - margin*2 - negW - sepW - posW) / 2;
    const xNeg = margin, xSep = xNeg + negW + gap, xPos = xSep + sepW + gap;

    drawLayer(ctx, xNeg, top, negW, bodyH, '#334155', '#64748b', s.negativeLithiation);
    drawLayer(ctx, xSep, top, sepW, bodyH, '#0f172a', '#94a3b8', .35);
    drawLayer(ctx, xPos, top, posW, bodyH, '#164e63', '#22d3ee', s.positiveLithiation);

    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Graphite', xNeg + negW/2, 18); ctx.fillText('Separator', xSep + sepW/2, 18); ctx.fillText('Cathode', xPos + posW/2, 18);

    const direction = s.currentA > 0.03 ? 1 : s.currentA < -0.03 ? -1 : 0;
    const progress = ((s.timeS || 0) % 4) / 4;
    for (let i = 0; i < 18; i++) {
      const row = i % 6, col = Math.floor(i / 6);
      const base = (row + 0.5) / 6;
      let p = (base + progress * (direction || .15) + col * .13) % 1;
      if (p < 0) p += 1;
      const x = xNeg + negW * .82 + p * (xPos - xNeg - negW * .64);
      const y = top + bodyH * (0.15 + 0.7 * ((i * 37) % 17) / 16);
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fillStyle = 'rgba(165,243,252,.88)'; ctx.fill();
    }

    if (direction) {
      const y = h - 9; const from = direction > 0 ? xNeg + 20 : xPos + posW - 20; const to = direction > 0 ? xPos + posW - 20 : xNeg + 20;
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(from,y); ctx.lineTo(to,y); ctx.stroke();
      const sign = to > from ? 1 : -1; ctx.beginPath(); ctx.moveTo(to,y); ctx.lineTo(to-7*sign,y-4); ctx.lineTo(to-7*sign,y+4); ctx.closePath(); ctx.fillStyle='#67e8f9'; ctx.fill();
    }
  }
}

function drawLayer(ctx, x, y, w, h, base, active, fraction) {
  ctx.fillStyle = base; ctx.fillRect(x,y,w,h);
  ctx.globalAlpha = .25 + .65 * clamp(fraction,0,1); ctx.fillStyle = active; ctx.fillRect(x,y,w,h); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(226,232,240,.22)'; ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  ctx.fillStyle = 'rgba(15,23,42,.45)';
  for (let i=0;i<28;i++) { const px=x+6+((i*47)%Math.max(8,w-12)); const py=y+6+((i*31)%Math.max(8,h-12)); ctx.beginPath();ctx.arc(px,py,1.2+(i%3)*.4,0,Math.PI*2);ctx.fill(); }
}
