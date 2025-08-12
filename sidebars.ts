import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Welcome',
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'concepts/what-is-nats',
        'concepts/pub-sub-basics',
      ],
    },
    {
      type: 'doc',
      id: 'getting-started/index',
      label: 'Getting Started',
    },
  ],
};

export default sidebars;