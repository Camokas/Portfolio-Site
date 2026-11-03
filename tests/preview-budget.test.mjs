import test from 'node:test';
import assert from 'node:assert/strict';
import {choosePreviewMotion} from '../src/scripts/previewBudget.mjs';
const item=(id,extra={})=>({id,kind:'model',pixels:0,visible:1,engaged:false,priority:0,...extra});
test('all categories share a budget, with hover/focus before automatic motion',()=>{
 const cards=[item('a',{priority:3}),item('b',{priority:2}),item('c',{engaged:true}),item('d')];
 assert.deepEqual([...choosePreviewMotion(cards)],['c','a']);
 assert.deepEqual([...choosePreviewMotion(cards,{limit:1})],['c']);
});
test('mostly hidden previews and high-resolution videos do not autoplay',()=>{
 const cards=[item('hidden',{visible:.1,engaged:true}),item('4k',{kind:'video',pixels:3840*2160}),item('normal',{kind:'video',pixels:1280*720})];
 assert.deepEqual([...choosePreviewMotion(cards)],['normal']);
});
test('an explicitly engaged high-resolution video takes the whole playback budget',()=>{
 assert.deepEqual([...choosePreviewMotion([item('model'),item('4k',{kind:'video',pixels:3840*2160,engaged:true})])],['4k']);
});
test('reduced motion and data saving disable background playback',()=>{
 assert.equal(choosePreviewMotion([item('a')],{reduced:true}).size,0);
 assert.equal(choosePreviewMotion([item('a')],{saveData:true}).size,0);
});
