import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Welcome",
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: ["concepts/what-is-nats", "concepts/pub-sub-basics"],
    },
    {
      type: "doc",
      id: "getting-started/index",
      label: "Getting Started",
    },
  ],

  tutorialsSidebar: [
    {
      type: "doc",
      id: "tutorials/index",
      label: "Tutorials",
    },
  ],

  guidesSidebar: [
    {
      type: "doc",
      id: "guides/index",
      label: "Guides",
    },
  ],

  referenceSidebar: [
    {
      type: "doc",
      id: "reference/index",
      label: "Reference",
    },
    {
      type: "category",
      label: "Protocols",
      collapsed: true,
      link: {
        type: "doc",
        id: "reference/protocols/index",
      },
      items: [
        "reference/protocols/client",
        "reference/protocols/route",
        "reference/protocols/leafnode",
        "reference/protocols/gateway",
      ],
    },
  ],
};

export default sidebars;
