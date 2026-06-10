import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Sidebar for the 'tutorials' docs plugin instance.
 *
 * Tutorials are learning-oriented, hand-held walkthroughs (the Diataxis
 * "tutorial" quadrant): one small, complete, guaranteed-success result each,
 * with minimal explanation. They hand off to the Learn deep dives for the
 * "why" and to Reference for the exhaustive detail.
 *
 * Hand-authored (like sidebars-learn.ts), not auto-generated. The sidebar key
 * MUST stay `tutorialsSidebar` to match the navbar item in docusaurus.config.ts.
 */
const sidebars: SidebarsConfig = {
  tutorialsSidebar: [
    {
      type: "doc",
      id: "index",
      label: "Tutorials",
    },
    {
      type: "category",
      label: "Get started",
      collapsed: false,
      items: [
        "hello-nats",
        "request-reply",
        "work-queue",
      ],
    },
    {
      type: "category",
      label: "Persistence",
      collapsed: false,
      items: [
        "first-stream",
        "stream-consumer",
        "key-value",
      ],
    },
    {
      type: "category",
      label: "Put it together",
      collapsed: false,
      items: [
        "build-an-app",
      ],
    },
  ],
};

export default sidebars;
