import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { decodePsdComposite } from './lib/psd-composite.mjs';
import { unitySpritesToTopLeft } from '../src/data/atlasGeometry.mjs';

const sources = JSON.parse(await fs.readFile('src/data/atlasSources.json', 'utf8'));
for (const source of sources) {
  const input = await fs.readFile(path.join('public', source.source));
  const hash = createHash('sha256').update(input).update(JSON.stringify(source.sprites)).update('atlas-v3').digest('hex');
  const output = path.join('public', source.image), manifestPath = path.join('public', source.manifest);
  let previous;
  try { previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch { /* First export. */ }
  if (previous?.hash === hash && await fs.stat(output).catch(() => false)) continue;
  const decoded = /\.psd$/i.test(source.source) ? decodePsdComposite(input) : undefined;
  const image = decoded ? sharp(decoded.data, { raw: { width: decoded.width, height: decoded.height, channels: 4 } }) : sharp(input);
  const { width, height } = decoded ?? await image.metadata();
  const sprites = unitySpritesToTopLeft(source.sprites, width, height);
  const rgba = await image.clone().ensureAlpha().raw().toBuffer();
  for (const sprite of sprites) {
    let visible = false;
    for (let y = sprite.y; y < sprite.y + sprite.height && !visible; y++) {
      for (let x = sprite.x; x < sprite.x + sprite.width; x++) if (rgba[(y * width + x) * 4 + 3]) { visible = true; break; }
    }
    if (!visible) sprite.empty = true;
  }
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3]) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  const bounds = right < 0 ? { x: 0, y: 0, width, height } : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await image.png({ compressionLevel: 9 }).toFile(output);
  await fs.writeFile(manifestPath, JSON.stringify({ width, height, bounds, hash, sprites }) + '\n');
  console.log(`${source.title}: ${width} × ${height}, ${sprites.length} regions`);
}
