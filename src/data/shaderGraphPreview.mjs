import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProjectAssetPath } from './projectAssetPaths.mjs';

// Unity serializes modern graphs as a stream of JSON objects, not one JSON array.
export function graphObjects(source) {
  const objects = [];
  let depth = 0, start = -1, quoted = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') { if (depth++ === 0) start = i; }
    else if (char === '}' && --depth === 0) objects.push(JSON.parse(source.slice(start, i + 1)));
  }
  if (depth || quoted || !objects.length) throw new Error('Invalid Shader Graph JSON');
  return objects;
}

const cache = new Map();
const escapeXml = text => String(text).replace(/[<>&"']/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[char]));
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function shaderGraphPreview(src) {
  if (!isProjectAssetPath(src)) throw new Error('Invalid graph path');
  const file = resolve('public', src);
  const stamp = statSync(file).mtimeMs;
  if (cache.get(src)?.stamp === stamp) return cache.get(src).image;
  const objects = graphObjects(readFileSync(file, 'utf8'));
  const root = objects.find(item => item.m_Nodes);
  if (!root) throw new Error('Graph nodes are missing');
  const lookup = new Map(objects.map(item => [item.m_ObjectId, item]));
  const nodes = root.m_Nodes.map(item => item.JSONnodeData ? JSON.parse(item.JSONnodeData) : lookup.get(item.m_Id)).filter(Boolean)
    .map(node => {
      const pos = node.m_DrawState?.m_Position ?? {};
      const slots = (node.m_Slots ?? []).map(slot => slot.JSONnodeData ? JSON.parse(slot.JSONnodeData) : lookup.get(slot.m_Id)).filter(Boolean);
      const inputs = slots.filter(slot => slot.m_SlotType === 0), outputs = slots.filter(slot => slot.m_SlotType === 1);
      return { id: node.m_ObjectId ?? node.m_GuidSerialized, x: number(pos.x, 0), y: number(pos.y, 0),
        width: 210, height: 38 + Math.max(1, inputs.length, outputs.length) * 19,
        name: node.m_Name || (node.m_Type ?? node.type ?? 'Node').split('.').at(-1).replace(/Node$/, ''), inputs, outputs };
    });
  if (!nodes.length) throw new Error('No graph nodes to preview');
  const byId = new Map(nodes.map(node => [node.id, node]));
  const port = (node, id, output) => {
    const slots = output ? node.outputs : node.inputs;
    const index = Math.max(0, slots.findIndex(slot => slot.m_Id === id));
    return { x: node.x + (output ? node.width : 0), y: node.y + 38 + index * 19 };
  };
  const edges = (root.m_Edges ?? []).map(raw => {
    const edge = raw.JSONnodeData ? JSON.parse(raw.JSONnodeData) : raw;
    const input = edge.m_InputSlot, output = edge.m_OutputSlot;
    const a = byId.get(output?.m_Node?.m_Id ?? output?.m_NodeGUIDSerialized);
    const b = byId.get(input?.m_Node?.m_Id ?? input?.m_NodeGUIDSerialized);
    if (!a || !b) return '';
    const from = port(a, output.m_SlotId, true), to = port(b, input.m_SlotId, false);
    const bend = Math.max(60, Math.abs(to.x - from.x) * 0.45);
    return `<path d="M${from.x} ${from.y} C${from.x + bend} ${from.y},${to.x - bend} ${to.y},${to.x} ${to.y}"/>`;
  }).join('');
  const left = Math.min(...nodes.map(node => node.x)) - 40, top = Math.min(...nodes.map(node => node.y)) - 40;
  const width = Math.max(...nodes.map(node => node.x + node.width)) - left + 40;
  const height = Math.max(...nodes.map(node => node.y + node.height)) - top + 40;
  const boxes = nodes.map(node => `<g transform="translate(${node.x} ${node.y})"><rect width="${node.width}" height="${node.height}" rx="6" fill="#252b32" stroke="#607384"/><text x="12" y="23" fill="#e6edf3" font-family="Arial,sans-serif" font-size="14">${escapeXml(node.name.slice(0, 25))}</text>${[...node.inputs.map((slot, i) => `<circle cx="0" cy="${38 + i * 19}" r="4" fill="#b7cbea"/>`), ...node.outputs.map((slot, i) => `<circle cx="210" cy="${38 + i * 19}" r="4" fill="#8bdbcb"/>`)].join('')}</g>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#10161c"/><g fill="none" stroke="#8bcbcf" stroke-width="3">${edges}</g>${boxes}</svg>`;
  const image = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(src, { stamp, image });
  return image;
}
