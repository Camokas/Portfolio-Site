import test from 'node:test';
import assert from 'node:assert/strict';
import remarkMediaGroups from '../src/plugins/remark-media-groups.mjs';

const text = value => ({ type: 'paragraph', children: [{ type: 'text', value }] });
const media = (name, grouped = true) => ({ type: 'mdxJsxFlowElement', name, attributes: grouped
  ? [{ type: 'mdxJsxAttribute', name: 'group', value: null }] : [], children: [] });
const transform = children => {
  const tree = { type: 'root', children };
  remarkMediaGroups()(tree);
  return tree.children;
};

test('preceding heading and prose join consecutive mixed media', () => {
  const heading = { type: 'heading', depth: 2, children: [] };
  const result = transform([heading, text('Explanation'), media('Video'), media('Code')]);
  assert.equal(result.length, 1);
  assert.equal(result[0].children[0].children.length, 2);
  assert.deepEqual(result[0].children[1].children.map(node => node.name), ['Video', 'Code']);
});
test('new prose starts a separate group and ungrouped media is a boundary', () => {
  const result = transform([media('Video', false), text('First'), media('Gallery'), text('Second'), media('Models')]);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'Video');
  assert.equal(result[1].children[0].children[0].children[0].value, 'First');
  assert.equal(result[2].children[0].children[0].children[0].value, 'Second');
});
test('no prose means full-width media; separators are retained', () => {
  const result = transform([text('Separate'), { type: 'thematicBreak' }, media('ShaderGraph')]);
  assert.equal(result[1].type, 'thematicBreak');
  assert.equal(result[2].attributes[0].value, 'project-media-group media-only');
});
test('group=false and unrelated components remain unchanged', () => {
  const video = media('Video');
  video.attributes[0].value = { type: 'mdxJsxAttributeValueExpression', value: 'false' };
  const result = transform([text('Keep'), video, media('OtherComponent')]);
  assert.equal(result.length, 3);
  assert.equal(result[1], video);
});
