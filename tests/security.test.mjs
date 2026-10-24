import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('Shader Graph executable assets are local and protected by valid SRI hashes', async () => {
  const viewerDirectory = path.join(root, 'public', 'vendor', 'shader-graph');
  const html = await readFile(path.join(viewerDirectory, 'index.html'), 'utf8');
  const resources = [
    ...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*integrity="(sha384-[^"]+)"[^>]*>/gi),
  ];

  assert.equal(resources.length, 4, 'Every viewer script and stylesheet must use SRI');

  for (const [, relativePath, integrity] of resources) {
    assert.equal(/^https?:/i.test(relativePath), false, `${relativePath} must stay self-hosted`);
    const bytes = await readFile(path.join(viewerDirectory, ...relativePath.split('/')));
    const expected = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
    assert.equal(integrity, expected, `${relativePath} has an outdated integrity hash`);
  }
});

test('GitHub Actions are pinned to immutable commit hashes', async () => {
  const workflowsDirectory = path.join(root, '.github', 'workflows');
  const workflowFiles = (await readdir(workflowsDirectory)).filter((file) => /\.ya?ml$/i.test(file));

  for (const file of workflowFiles) {
    const source = await readFile(path.join(workflowsDirectory, file), 'utf8');
    const actionReferences = [...source.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);

    assert.ok(actionReferences.length > 0, `${file} must contain at least one action`);
    for (const reference of actionReferences) {
      assert.match(reference, /@[0-9a-f]{40}$/i, `${reference} in ${file} is not pinned`);
    }
  }
});

test('Astro CSP keeps executable content local and blocks risky document features', async () => {
  const config = await readFile(path.join(root, 'astro.config.mjs'), 'utf8');

  for (const directive of [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "connect-src 'self' https://api.github.com",
  ]) {
    assert.ok(config.includes(directive), `Missing CSP directive: ${directive}`);
  }

  assert.equal(/scriptDirective\s*:\s*\{[^}]*unsafe-inline/s.test(config), false);
  assert.equal(/https?:\/\/[^'"\s]+\.(?:js|css)/i.test(config), false);
});
