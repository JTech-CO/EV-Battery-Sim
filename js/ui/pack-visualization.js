import { clamp } from '../utils/math.js';
import { observeResize } from '../utils/compat.js';

export class PackVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.yaw = -0.62;
    this.pitch = 0.88;
    this.zoom = 1;
    this.dragging = false;
    this.lastPointer = null;
    this.unobserve = observeResize(canvas, this.draw.bind(this));
    this.bindInteraction();
  }

  bindInteraction() {
    const self = this;
    this.canvas.addEventListener('pointerdown', function (event) {
      self.dragging = true;
      self.lastPointer = { x: event.clientX, y: event.clientY };
      if (self.canvas.setPointerCapture) self.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', function (event) {
      if (!self.dragging || !self.lastPointer) return;
      const dx = event.clientX - self.lastPointer.x;
      const dy = event.clientY - self.lastPointer.y;
      self.yaw += dx * 0.008;
      self.pitch = clamp(self.pitch + dy * 0.006, 0.35, 1.25);
      self.lastPointer = { x: event.clientX, y: event.clientY };
      self.draw();
    });
    const release = function () { self.dragging = false; self.lastPointer = null; };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', release);
    this.canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      self.zoom = clamp(self.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.72, 1.55);
      self.draw();
    }, { passive: false });
  }

  update(state) {
    this.state = state;
    this.draw();
  }

  project(point, w, h, scale) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = point.x * cy - point.y * sy;
    const y1 = point.x * sy + point.y * cy;
    const z1 = point.z;
    const y2 = y1 * cp - z1 * sp;
    const depth = y1 * sp + z1 * cp;
    const perspective = 1 / Math.max(0.62, 1 + depth * 0.018);
    return {
      x: w * 0.50 + x1 * scale * perspective,
      y: h * 0.58 + y2 * scale * perspective,
      depth: depth
    };
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
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width, h = rect.height;
    const state = this.state || { soc: 0.8, temperatureC: 25, packPowerKW: 0, series: 108, parallel: 10 };
    const scale = Math.min(w / 11, h / 7) * this.zoom;
    const cols = w < 430 ? 4 : 5;
    const rows = 3;
    const dx = 1.42, dy = 1.25;
    const cellW = 0.92, cellD = 0.68, cellH = 1.45;
    const totalRendered = cols * rows;
    const items = [];

    const tempNorm = clamp((state.temperatureC - 20) / 45, 0, 1);
    const hue = 190 - tempNorm * 155;
    const light = 35 + clamp(state.soc, 0, 1) * 18;
    const baseColor = 'hsl(' + hue.toFixed(0) + ', 68%, ' + light.toFixed(0) + '%)';
    const sideColor = 'hsl(' + hue.toFixed(0) + ', 48%, ' + Math.max(18, light - 14).toFixed(0) + '%)';
    const topColor = 'hsl(' + hue.toFixed(0) + ', 72%, ' + Math.min(70, light + 8).toFixed(0) + '%)';

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = (c - (cols - 1) / 2) * dx;
        const y = (r - (rows - 1) / 2) * dy;
        const center = this.project({ x: x, y: y, z: cellH * 0.5 }, w, h, scale);
        items.push({ x: x, y: y, centerDepth: center.depth, index: r * cols + c });
      }
    }
    items.sort(function (a, b) { return b.centerDepth - a.centerDepth; });

    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = tempNorm > 0.65 ? 'rgba(251,113,133,.24)' : 'rgba(34,211,238,.15)';
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      drawPackCuboid(this, ctx, item.x, item.y, cellW, cellD, cellH, w, h, scale, baseColor, sideColor, topColor, state.soc, item.index / Math.max(1, totalRendered - 1));
    }
    ctx.restore();

    drawPackBusbars(this, ctx, cols, rows, dx, dy, cellH, w, h, scale, state.packPowerKW);

    ctx.fillStyle = 'rgba(226,232,240,.92)';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(state.series) + 's × ' + String(state.parallel) + 'p', 14, 12);
    ctx.fillStyle = 'rgba(148,163,184,.85)';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('rendered ' + totalRendered + ' / pack ' + (state.series * state.parallel).toLocaleString(), 14, 31);

    const powerLabel = (state.packPowerKW >= 0 ? '+' : '') + Number(state.packPowerKW || 0).toFixed(1) + ' kW';
    ctx.textAlign = 'right';
    ctx.fillStyle = state.packPowerKW < 0 ? 'rgba(163,230,53,.92)' : 'rgba(103,232,249,.92)';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(powerLabel, w - 14, 12);
    ctx.fillStyle = 'rgba(148,163,184,.85)';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(Number(state.temperatureC || 0).toFixed(1) + ' °C · SOC ' + (Number(state.soc || 0) * 100).toFixed(1) + '%', w - 14, 31);
  }
}

function packFace(points, visual, w, h, scale) {
  return points.map(function (p) { return visual.project(p, w, h, scale); });
}

function packPolygon(ctx, points, fill, stroke) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function drawPackCuboid(visual, ctx, cx, cy, width, depth, height, w, h, scale, frontColor, sideColor, topColor, soc, seed) {
  const x0 = cx - width / 2, x1 = cx + width / 2;
  const y0 = cy - depth / 2, y1 = cy + depth / 2;
  const z0 = 0, z1 = height;
  const stroke = 'rgba(226,232,240,.18)';
  const left = packFace([{x:x0,y:y0,z:z0},{x:x0,y:y1,z:z0},{x:x0,y:y1,z:z1},{x:x0,y:y0,z:z1}], visual, w, h, scale);
  const right = packFace([{x:x1,y:y0,z:z0},{x:x1,y:y1,z:z0},{x:x1,y:y1,z:z1},{x:x1,y:y0,z:z1}], visual, w, h, scale);
  const front = packFace([{x:x0,y:y1,z:z0},{x:x1,y:y1,z:z0},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}], visual, w, h, scale);
  const back = packFace([{x:x0,y:y0,z:z0},{x:x1,y:y0,z:z0},{x:x1,y:y0,z:z1},{x:x0,y:y0,z:z1}], visual, w, h, scale);
  const top = packFace([{x:x0,y:y0,z:z1},{x:x1,y:y0,z:z1},{x:x1,y:y1,z:z1},{x:x0,y:y1,z:z1}], visual, w, h, scale);
  packPolygon(ctx, back, sideColor, stroke);
  packPolygon(ctx, left, sideColor, stroke);
  packPolygon(ctx, right, sideColor, stroke);
  packPolygon(ctx, front, frontColor, stroke);
  packPolygon(ctx, top, topColor, stroke);

  const fillHeight = height * clamp(soc + (seed - 0.5) * 0.015, 0, 1);
  if (fillHeight > 0.02 && fillHeight < height - 0.02) {
    const z = fillHeight;
    const level = packFace([{x:x0+0.05,y:y1+0.001,z:z},{x:x1-0.05,y:y1+0.001,z:z}], visual, w, h, scale);
    ctx.beginPath();
    ctx.moveTo(level[0].x, level[0].y);
    ctx.lineTo(level[1].x, level[1].y);
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawPackBusbars(visual, ctx, cols, rows, dx, dy, height, w, h, scale, powerKW) {
  const z = height + 0.12;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = powerKW < 0 ? 'rgba(163,230,53,.58)' : 'rgba(103,232,249,.55)';
  for (let r = 0; r < rows; r += 1) {
    const y = (r - (rows - 1) / 2) * dy;
    const a = visual.project({ x: -(cols - 1) * dx / 2, y: y, z: z }, w, h, scale);
    const b = visual.project({ x: (cols - 1) * dx / 2, y: y, z: z }, w, h, scale);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}
