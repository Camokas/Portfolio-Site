import test from 'node:test';
import assert from 'node:assert/strict';
import { graphObjects, shaderGraphPreview } from '../src/data/shaderGraphPreview.mjs';

test('Unity JSON stream preserves braces and escaped quotes in text', () => {
  const source = JSON.stringify({ name: 'text { } " \\' }) + '\n\n' + JSON.stringify({ number: 2 });
  assert.equal(graphObjects(source).length, 2);
  assert.throws(() => graphObjects('{"broken":'));
});
test('real graphs produce static SVG nodes and connections without scripts', () => {
  for (const path of ['projects/Shaders/FirstBuildest/FirstBuildest-SettingsPreviewShader/SettPreviewShad.shadergraph',
    'projects/Shaders/FirstBuildest/FirstBuildest-CustomTreeShader/TestLeavesShad.shadergraph',
    'projects/Shaders/ToTheSky2/ToTheSky2-NoiseCloudsShader/MenuSkyShader.shadergraph']) {
    const image = shaderGraphPreview(path);
    const svg = decodeURIComponent(image.split(',')[1]);
    assert.match(svg, /<path d="M/);
    assert.match(svg, /<text /);
    assert.doesNotMatch(svg, /NaN|Infinity|<script|<iframe/);
    assert.equal(shaderGraphPreview(path), image);
  }
});
