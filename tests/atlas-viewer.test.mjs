import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodePsdComposite } from '../scripts/lib/psd-composite.mjs';
import { unitySpritesToTopLeft, spriteAt } from '../src/data/atlasGeometry.mjs';

function fixture(compression, body, transparent = true) {
  const header = Buffer.alloc(26);
  header.write('8BPS'); header.writeUInt16BE(1,4); header.writeUInt16BE(4,12);
  header.writeUInt32BE(1,14); header.writeUInt32BE(2,18); header.writeUInt16BE(8,22); header.writeUInt16BE(3,24);
  const sections = Buffer.alloc(18);
  sections.writeUInt32BE(6,8); sections.writeUInt32BE(2,12); sections.writeInt16BE(transparent ? -1 : 1,16);
  const code = Buffer.alloc(2); code.writeUInt16BE(compression);
  return Buffer.concat([header,sections,code,body]);
}
const planes = Buffer.from([10,20,30,40,50,60,255,0]);
const rgba = [10,30,50,255,20,40,60,0];

test('PSD composite retains exact RGB pixels and merged transparency, ignoring extra non-alpha channels', () => {
  assert.deepEqual([...decodePsdComposite(fixture(0,planes)).data],rgba);
  assert.deepEqual([...decodePsdComposite(fixture(0,planes,false)).data],[10,30,50,255,20,40,60,255]);
});
test('PSD PackBits decodes literals, repeated pixels and no-op controls exactly', () => {
  const table = Buffer.from([0,3,0,2,0,4,0,3]);
  const runs = Buffer.from([1,10,20,255,30,128,1,50,60,1,255,0]);
  assert.deepEqual([...decodePsdComposite(fixture(1,Buffer.concat([table,runs]))).data],[10,30,50,255,20,30,60,0]);
});
test('PSD ZIP and ZIP prediction reconstruct the original scanline values', () => {
  assert.deepEqual([...decodePsdComposite(fixture(2,deflateSync(planes))).data],rgba);
  const predicted=Buffer.from([10,10,30,10,50,10,255,1]);
  assert.deepEqual([...decodePsdComposite(fixture(3,deflateSync(predicted))).data],rgba);
});
test('PSD decoder rejects truncated and overflowing input instead of producing damaged previews', () => {
  assert.throws(()=>decodePsdComposite(Buffer.from('8BPS')),/Truncated/);
  assert.throws(()=>decodePsdComposite(fixture(0,planes.subarray(0,7))),/Truncated/);
  assert.throws(()=>decodePsdComposite(fixture(1,Buffer.from([0,2,0,0,0,0,0,0,254,20]))),/Invalid PSD RLE run/);
});
test('Unity bottom-left rectangles become top-left without changing non-uniform sprite sizes', () => {
  assert.deepEqual(unitySpritesToTopLeft([{name:'tree',x:40,y:12,width:80,height:120},{name:'leaf',x:5,y:8,width:16,height:16}],256,256),[
    {name:'tree',x:40,y:124,width:80,height:120},{name:'leaf',x:5,y:232,width:16,height:16},
  ]);
  assert.throws(()=>unitySpritesToTopLeft([{name:'invalid',x:255,y:0,width:16,height:16}],256,256),/outside atlas/);
});
test('Click selection chooses the smallest overlapping sprite and respects cell edges', () => {
  const sprites=[{x:0,y:0,width:64,height:64},{x:16,y:16,width:16,height:16}];
  assert.equal(spriteAt(sprites,16,16),1);
  assert.equal(spriteAt(sprites,32,16),0);
  assert.equal(spriteAt(sprites,64,1),-1);
});
