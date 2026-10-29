import test from 'node:test';
import assert from 'node:assert/strict';
import { isProjectAssetPath, projectAssetUrl, isHttpsMediaUrl } from '../src/data/projectAssetPaths.mjs';

test('all media share a project-relative public path', () => {
  for (const name of ['cover.webp', 'demo.mp4', 'sound.mp3', 'mesh.glb', 'graph.shadergraph', 'files/source.zip']) {
    assert.equal(isProjectAssetPath(`projects/my-project/${name}`), true);
  }
	assert.equal(isProjectAssetPath('projects/Shaders/IsLands/My Project/demo.webm'), true);
});
test('reject traversal, absolute paths, schemes and encoded separators', () => {
  for (const value of ['../file.png', '/projects/a/file.png', 'projects/a/../file.png', 'projects/a/%2e%2e/file.png',
    'projects/a//file.png', 'projects/a\\file.png', 'C:/file.png', 'javascript:alert(1)', 'projects/a/file.png?x=1',
    'public/projects/a/file.png', 'projects/a/./file.png', 'projects/a/file.png#x']) {
    assert.equal(isProjectAssetPath(value), false, value);
  }
});
test('encode filenames once and support both root and GitHub Pages bases', () => {
  assert.equal(projectAssetUrl('projects/My Project/кадр 1.png', '/Portfolio-Site/'),
    '/Portfolio-Site/projects/My%20Project/%D0%BA%D0%B0%D0%B4%D1%80%201.png');
  assert.equal(projectAssetUrl('projects/a/model.glb', '/'), '/projects/a/model.glb');
  assert.throws(() => projectAssetUrl('projects/a/../file.png', '/'));
});
test('external media accepts only HTTPS without credentials', () => {
  assert.equal(isHttpsMediaUrl('https://example.com/video.mp4'), true);
  for (const url of ['http://example.com/video.mp4', '//example.com/file', 'https://name:secret@example.com/file']) {
    assert.equal(isHttpsMediaUrl(url), false);
  }
});
