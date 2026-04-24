import { visit } from 'unist-util-visit';

function getText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(getText).join('');
  return '';
}

function collectTabLabels(tabsContainer) {
  const labels = [];
  visit(tabsContainer, 'element', (n) => {
    if (n.tagName !== 'li') return;
    const role = n.properties?.role;
    const cls = n.properties?.className ?? [];
    if (role !== 'tab' && !cls.includes('tabs__item')) return;
    labels.push(getText(n).trim());
  });
  return labels;
}

function collectTabPanels(tabsContainer) {
  const panels = [];
  visit(tabsContainer, 'element', (n) => {
    if (n.tagName !== 'div') return;
    const role = n.properties?.role;
    if (role !== 'tabpanel') return;
    panels.push(n);
  });
  return panels;
}

export default function rehypeFlattenTabs() {
  return (tree) => {
    const replacements = [];
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.tagName !== 'div') return;
      const classes = node.properties?.className ?? [];
      if (!classes.includes('tabs-container')) return;

      const labels = collectTabLabels(node);
      const panels = collectTabPanels(node);
      if (labels.length === 0 || panels.length === 0) return;

      const flattened = [];
      const pairCount = Math.min(labels.length, panels.length);
      for (let i = 0; i < pairCount; i++) {
        flattened.push({
          type: 'element',
          tagName: 'h4',
          properties: {},
          children: [{ type: 'text', value: labels[i] }],
        });
        const panel = panels[i];
        if (panel.properties) delete panel.properties.hidden;
        for (const child of panel.children || []) flattened.push(child);
      }
      replacements.push({ parent, index, replacement: flattened });
    });
    for (const { parent, index, replacement } of replacements.reverse()) {
      parent.children.splice(index, 1, ...replacement);
    }
  };
}
