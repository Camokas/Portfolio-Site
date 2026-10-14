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
    tree.children = result;
  };
}
