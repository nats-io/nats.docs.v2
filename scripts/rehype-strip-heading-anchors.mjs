import { visit } from 'unist-util-visit';

export default function rehypeStripHeadingAnchors() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      node.children = (node.children || []).filter((child) => {
        if (child.type !== 'element' || child.tagName !== 'a') return true;
        const cls = child.properties?.className ?? [];
        if (cls.includes('hash-link')) return false;
        const href = child.properties?.href ?? '';
        if (typeof href === 'string' && href.startsWith('#')) return false;
        return true;
      });
    });
  };
}
