import test from 'node:test';
import assert from 'node:assert/strict';
import { previewDistance } from '../src/scripts/modelPreviewFraming.mjs';

test('framing keeps long, tall and flat models inside portrait and landscape views throughout rotation', () => {
  const d = [3.6, 2.5, 4.6], length = Math.hypot(...d), forward = d.map(n => n / length);
  const h = Math.hypot(forward[0], forward[2]);
  const right = [forward[2]/h, 0, -forward[0]/h];
  const up = [-forward[1]*forward[0]/h, h, -forward[1]*forward[2]/h];
  const dot = (p, a) => p.reduce((v,n,i) => v+n*a[i],0);
  const tan = Math.tan(42*Math.PI/360);
  for (const size of [{x:2.5,y:0.1,z:0.1},{x:0.1,y:2.5,z:0.1},{x:2.5,y:0.01,z:2.5},{x:2.5,y:2.5,z:2.5}]) {
    for (const aspect of [0.65,1,16/9,2.5]) {
      const distance = previewDistance(size, aspect, 42, true);
      for(let degrees=0; degrees<360; degrees+=3) {
        const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
        for(const x of [-size.x/2,size.x/2]) for(const y of [-size.y/2,size.y/2]) for(const z of [-size.z/2,size.z/2]) {
          const p=[x*c+z*s,y,z*c-x*s], depth=distance-dot(p,forward);
          assert.ok(depth>0);
          assert.ok(Math.abs(dot(p,right))/(depth*tan*aspect)<0.86,'Horizontal crop');
          assert.ok(Math.abs(dot(p,up))/(depth*tan)<0.86,'Vertical crop');
        }
      }
    }
  }
});
test('framing adapts to object scale and viewport instead of one fixed camera distance', () => {
  const size={x:2,y:1,z:0.5};
  assert.ok(previewDistance(size,0.6)>previewDistance(size,2));
  assert.ok(Math.abs(previewDistance({x:20,y:10,z:5},1)/previewDistance(size,1)-10)<1e-10);
});
