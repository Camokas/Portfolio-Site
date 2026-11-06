import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodePsdComposite } from '../scripts/lib/psd-composite.mjs';
import { unitySpritesToTopLeft, spriteAt, atlasPreviewCells } from '../src/data/atlasGeometry.mjs';
import { createAtlasLoader } from '../src/scripts/atlasLoader.mjs';

const deferred = () => {let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
test('Rapid atlas switching commits only the latest matching image and sprite map, even at equal dimensions', async () => {
  const first=deferred(),second=deferred(),ready=[],errors=[];
  const loader=createAtlasLoader({
    loadData:async name=>({width:1024,height:1024,sprites:[{name}]}),
    loadImage:src=>(src==='first'?first:second).promise,
    onStart:()=>{},onReady:value=>ready.push(value),onError:error=>errors.push(error),onFinish:()=>{},
  });
  const old=loader.select({src:'first',manifest:'first-map'});
  const current=loader.select({src:'second',manifest:'second-map'});
  second.resolve({naturalWidth:1024,naturalHeight:1024,id:'second'});
  assert.equal(await current,true);
  first.resolve({naturalWidth:1024,naturalHeight:1024,id:'first'});
  assert.equal(await old,false);
  assert.equal(ready.length,1);
  assert.equal(ready[0].image.id,'second');assert.equal(ready[0].data.sprites[0].name,'second-map');
  assert.deepEqual(errors,[]);
});
test('Disconnected atlas loader cannot commit a late image', async () => {
  const image=deferred();let ready=0,finished=0;
  const loader=createAtlasLoader({loadData:async()=>({width:16,height:16,sprites:[{}]}),loadImage:()=>image.promise,onStart:()=>{},onReady:()=>ready++,onError:()=>{},onFinish:()=>finished++});
  const request=loader.select({src:'x',manifest:'x'});loader.cancel();
  image.resolve({naturalWidth:16,naturalHeight:16});await request;
  assert.equal(ready,0);assert.equal(finished,0);
});
test('Mismatched atlas metadata never becomes interactive', async () => {
  const errors=[];let ready=0;
  const loader=createAtlasLoader({loadData:async()=>({width:16,height:16,sprites:[{}]}),loadImage:async()=>({naturalWidth:32,naturalHeight:16}),onStart:()=>{},onReady:()=>ready++,onError:error=>errors.push(error),onFinish:()=>{}});
  assert.equal(await loader.select({src:'x',manifest:'x'}),false);
  assert.equal(ready,0);assert.match(errors[0].message,/dimensions differ/);
});

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

test('Card cells exclude transparent regions and duplicate rectangles, retaining different sprite sizes', () => {
  const cells = atlasPreviewCells([
    {x:0,y:0,width:16,height:16}, {x:0,y:0,width:16,height:16},
    {x:16,y:0,width:32,height:64}, {x:48,y:0,width:16,height:16,empty:true},
  ]);
  assert.deepEqual(cells,[[0,0,16,16],[16,0,32,64]]);
});

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
