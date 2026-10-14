// Build the layout before rendering: no client-side DOM moving or layout flash.
const mediaNames = new Set(['Video', 'Gallery', 'Image', 'Models', 'Audio', 'Code', 'ShaderGraph', 'ShaderGraphs', 'Resources', 'Downloads', 'Links']);
const proseTypes = new Set(['paragraph', 'heading', 'blockquote', 'list', 'code', 'table']);
const wrapper = (className, children) => ({
  type: 'mdxJsxFlowElement', name: 'div',
  attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: className }], children,
});
const isComment = node => node.type === 'mdxFlowExpression' && /^\s*\/\*[\s\S]*\*\/\s*$/.test(node.value);

export default function remarkMediaGroups() {
  return (tree) => {
    const result = [];
    for (const node of tree.children) {
      const attribute = node.type === 'mdxJsxFlowElement' && mediaNames.has(node.name)
        ? node.attributes.find(item => item.name === 'group') : undefined;
      const grouped = attribute && (attribute.value === null || attribute.value === 'true' ||
        (attribute.value?.type === 'mdxJsxAttributeValueExpression' && attribute.value.value.trim() === 'true'));
      if (!grouped) { result.push(node); continue; }
      node.attributes = node.attributes.filter(item => item !== attribute);
      if (node.name === 'Video') node.attributes.push({ type: 'mdxJsxAttribute', name: 'carousel', value: null });
      // Consecutive grouped media share the same right-hand column.
      const previous = result.findLast(item => !isComment(item));
      if (previous?.data?.mediaGroup) {
        previous.children.at(-1).children.push(node);
        continue;
      }
      const text = [];
      while (result.length) {
        const last = result.at(-1);
        if (isComment(last)) { result.pop(); continue; }
        if (!proseTypes.has(last.type)) break;
        text.unshift(result.pop());
        if (last.type === 'heading') break;
      }
      const row = wrapper(`project-media-group${text.length ? '' : ' media-only'}`, [
        ...(text.length ? [wrapper('project-group-text', text)] : []),
        wrapper('project-group-media', [node]),
      ]);
      row.data = { mediaGroup: true };
      result.push(row);
    }
    // Adjacent Video selections in one group are one carousel, not separate players.
    for (const row of result.filter(item => item.data?.mediaGroup)) {
      const children = row.children.at(-1).children;
      for (let index = 0; index < children.length - 1; index++) {
        const first = children[index], next = children[index + 1];
        if (first.name !== 'Video' || next.name !== 'Video') continue;
        const selection = node => {
          const attr = node.attributes.find(item => item.name === 'indices' || item.name === 'index');
          try {
            const value = JSON.parse(attr?.value?.value ?? 'null');
            const list = Array.isArray(value) ? value : [value];
            return list.every(item => Number.isInteger(item) && item > 0) ? list : null;
          } catch { return null; }
        };
        const a = selection(first), b = selection(next);
        if (!a || !b) continue;
        const values = [...new Set([...a, ...b])];
        const expression = { type: 'ArrayExpression', elements: values.map(value => ({ type: 'Literal', value, raw: String(value) })) };
        first.attributes = first.attributes.filter(item => item.name !== 'index' && item.name !== 'indices');
        first.attributes.push({ type: 'mdxJsxAttribute', name: 'indices', value: {
          type: 'mdxJsxAttributeValueExpression', value: JSON.stringify(values),
          data: { estree: { type: 'Program', sourceType: 'module', body: [{ type: 'ExpressionStatement', expression }] } },
        } });
        if (next.attributes.some(item => item.name === 'open') && !first.attributes.some(item => item.name === 'open')) {
          first.attributes.push(next.attributes.find(item => item.name === 'open'));
        }
        children.splice(index + 1, 1);
        index--;
      }
    }
    tree.children = result;
  };
}
