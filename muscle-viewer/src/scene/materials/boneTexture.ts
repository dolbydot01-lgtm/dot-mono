import * as THREE from 'three';
import { mulberry32 } from './random';

/**
 * Procedural bone surface: warm ivory with soft mottling, a faint grain
 * running along the bone and fine pores. Tiles seamlessly; also used as a
 * bump map so the surface catches light like real bone rather than plastic.
 */

const SIZE = 256;

/** Draw at (x, y) and at the wrapped positions so the texture tiles. */
function drawWrapped(draw: (x: number, y: number) => void, x: number, y: number, r: number) {
  for (const dx of [-SIZE, 0, SIZE]) {
    for (const dy of [-SIZE, 0, SIZE]) {
      if (x + dx + r < 0 || x + dx - r > SIZE || y + dy + r < 0 || y + dy - r > SIZE) continue;
      draw(x + dx, y + dy);
    }
  }
}

function drawBone(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(11);

  ctx.fillStyle = 'rgb(244,238,226)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Soft mottling: darker ochre patches and a few lighter ones.
  for (let i = 0; i < 140; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 8 + rand() * 40;
    const dark = rand() < 0.75;
    const alpha = dark ? 0.05 + rand() * 0.1 : 0.08 + rand() * 0.08;
    const color = dark ? `rgba(176,152,112,${alpha})` : `rgba(255,253,246,${alpha})`;
    drawWrapped(
      (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      },
      x,
      y,
      r,
    );
  }

  // Grain along the bone's length (texture V).
  for (let i = 0; i < 90; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const len = 20 + rand() * 70;
    ctx.strokeStyle = `rgba(160,140,108,${0.06 + rand() * 0.08})`;
    ctx.lineWidth = 0.6 + rand();
    drawWrapped(
      (px, py) => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (rand() - 0.5) * 3, py + len);
        ctx.stroke();
      },
      x,
      y,
      len,
    );
  }

  // Pores.
  for (let i = 0; i < 2600; i++) {
    const shade = 120 + Math.floor(rand() * 50);
    ctx.fillStyle = `rgba(${shade},${shade - 12},${shade - 30},${0.2 + rand() * 0.35})`;
    const s = rand() < 0.9 ? 1 : 2;
    ctx.fillRect(rand() * SIZE, rand() * SIZE, s, s);
  }
  return canvas;
}

let cached: THREE.CanvasTexture | null = null;

export function getBoneTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const tex = new THREE.CanvasTexture(drawBone());
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
