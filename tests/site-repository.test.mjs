import test from 'node:test';
import assert from 'node:assert/strict';
import { repositorySettings } from '../src/data/siteRepository.mjs';

test('Local default uses portfolio and GitHub builds follow the actual repository name', () => {
  assert.equal(repositorySettings().base, '/portfolio/');
  assert.equal(repositorySettings('Camokas/Portfolio-Site').base, '/Portfolio-Site/');
  const renamed = repositorySettings('Camokas/portfolio');
  assert.equal(renamed.base, '/portfolio/');
  assert.equal(renamed.url, 'https://github.com/Camokas/portfolio');
  assert.equal(renamed.commitsApi, 'https://api.github.com/repos/Camokas/portfolio/commits?sha=master&per_page=1');
});
test('Account Pages use the root and invalid repository paths are rejected', () => {
  assert.equal(repositorySettings('Camokas/camokas.github.io').base, '/');
  assert.throws(() => repositorySettings('Camokas/../portfolio'), /Invalid/);
});
