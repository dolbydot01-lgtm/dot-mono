import * as THREE from 'three';
import { mulberry32 } from './random';

/**
 * Procedural muscle-fibre texture: light background with darker vertical
 * grooves. Muscle bellies map texture V along their length, so the grooves
 * become fibres that run origin → insertion and converge at the tendons.
 * The same texture doubles as a bump map for a little surface relief.
 */

const SIZE = 256;
const FIBRES = 28;
// Tiles around a belly's circumference (u wraps 0 → 1 once around).
const REPEAT_AROUND = 2;

function drawFibres(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(7);

  ctx.fillStyle = 'rgb(236,236,236)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const spacing = SIZE / FIBRES;
  for (let i = 0; i < FIBRES; i++) {
    const x0 = i * spacing + (rand() - 0.5) * spacing * 0.5;
    const width = 0.8 + rand() * 1.6;
    const shade = 128 + Math.floor(rand() * 50);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = width;
    // Gentle waviness so fibres don't look ruled; endpoints match so the texture tiles vertically.
    const phase = rand() * Math.PI * 2;
    const amp = rand() * 1.2;
    ctx.beginPath();
    for (let y = 0; y <= SIZE; y += 8) {
      const x = x0 + Math.sin((y / SIZE) * Math.PI * 2 + phase) * amp;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Wrap the line that straddles the left/right edge so the texture tiles horizontally.
    if (x0 < width) {
      ctx.beginPath();
      ctx.moveTo(x0 + SIZE, 0);
      ctx.lineTo(x0 + SIZE, SIZE);
      ctx.stroke();
    }
  }

  // Faint speckle breaks up the regularity.
  for (let k = 0; k < 1400; k++) {
    const v = 200 + Math.floor(rand() * 40);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(rand() * SIZE, rand() * SIZE, 1, 2 + rand() * 4);
  }
  return canvas;
}

let cached: THREE.CanvasTexture | null = null;

export function getFiberTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const tex = new THREE.CanvasTexture(drawFibres());
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(REPEAT_AROUND, 1);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
