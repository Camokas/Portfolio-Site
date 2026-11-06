import fs from 'node:fs';
import path from 'node:path';

// Only import names and rectangles. Never modify the Unity project.
const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/import-unity-atlases.mjs <Unity Assets directory>');
const configPath = 'src/data/atlasSources.json';
const sources = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const matches = new Map();
function visit(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) visit(full);
    else if (sources.some(s => path.basename(s.source) + '.meta' === e.name)) {
      if (matches.has(e.name)) throw new Error(`Ambiguous source: ${e.name}`);
      matches.set(e.name, full);
    }
  }
}
visit(root);
for (const source of sources) {
  const meta = matches.get(path.basename(source.source) + '.meta');
  if (!meta) throw new Error(`Missing Unity metadata: ${source.source}`);
  const text = fs.readFileSync(meta, 'utf8');
  const sprites = [];
  const pattern = /^      name: (.+)\r?\n      rect:\r?\n        serializedVersion: \d+\r?\n        x: (\d+)\r?\n        y: (\d+)\r?\n        width: (\d+)\r?\n        height: (\d+)/gm;
  for (const [, value, x, y, width, height] of text.matchAll(pattern)) {
    const name = value.startsWith('"') ? JSON.parse(value) : value.startsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : value;
    sprites.push({ name, x: +x, y: +y, width: +width, height: +height });
  }
  if (!sprites.length) throw new Error(`No Sprite Editor rectangles found: ${meta}`);
  if (sprites.length !== [...text.matchAll(/^      name: /gm)].length) throw new Error(`Unsupported sprite rectangle syntax: ${meta}`);
  source.sprites = sprites;
  console.log(`${source.title}: ${sprites.length} sprite regions`);
}
const formatted = sources.map(({sprites, ...fields}) => {
  const properties = Object.entries(fields).map(([key,value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return '  {\n' + properties.join(',\n') + ',\n    "sprites": [\n' + sprites.map(sprite => '      '+JSON.stringify(sprite)).join(',\n') + '\n    ]\n  }';
});
fs.writeFileSync(configPath, '[\n' + formatted.join(',\n') + '\n]\n');
