import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaResolver} from '../src/data/localizedMediaUrl.mjs';
const pair={en:'projects/Test/Screen_ENVer.webp',ru:'projects/Test/Screen_RUVer.webp'};
const resolve=createMediaResolver([pair],'/Portfolio-Site/');
test('switches raw, absolute, and optimized production images both ways',()=>{
 for(const src of ['/Portfolio-Site/projects/Test/Screen_ENVer.webp',
   'https://camokas.github.io/Portfolio-Site/_astro/Screen_ENVer.hash_size.webp',
   '/Portfolio-Site/_astro/Screen_RUVer.hash.webp']) {
   assert.equal(resolve(src,'ru'),'/Portfolio-Site/'+pair.ru);
   assert.equal(resolve(src,'en'),'/Portfolio-Site/'+pair.en);
 }
});
test('leaves unpaired assets and data URLs intact',()=>{
 assert.equal(resolve('/Portfolio-Site/projects/plain.webp','ru'),'/Portfolio-Site/projects/plain.webp');
 assert.equal(resolve('data:image/png;base64,AAA','ru'),'data:image/png;base64,AAA');
});

test('switches Astro development image-service and full-size filesystem URLs',()=>{
 const original='/@fs/C:/Users/Camoka/Desktop/Portfolio Site/public/'+pair.en;
 const service='/Portfolio-Site/_image/?'+new URLSearchParams({href:original+'?origWidth=835&origHeight=427&origFormat=webp',w:'835',f:'webp'});
 for (const src of [original,service,'http://localhost:4321'+service]) {
   assert.equal(resolve(src,'ru'),'/Portfolio-Site/'+pair.ru);
   assert.equal(resolve(src,'en'),'/Portfolio-Site/'+pair.en);
 }
 assert.equal(resolve(resolve(service,'ru'),'en'),'/Portfolio-Site/'+pair.en);
});

test('does not rewrite unrelated development images or unknown filesystem paths',()=>{
 const unrelated='/Portfolio-Site/_image/?href='+encodeURIComponent('/@fs/C:/other/public/projects/plain.webp');
 assert.equal(resolve(unrelated,'ru'),unrelated);
 const outside='/@fs/C:/outside/projects/Test/Screen_ENVer.webp';
 assert.equal(resolve(outside,'ru'),outside);
});
