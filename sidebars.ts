import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Sidebar for the default docs plugin instance (Docs / Guides / Tutorials).
 * The reference sidebar now lives in sidebars-reference.ts, and versioned
 * copies in reference_versioned_sidebars/.
 */
const sidebars: SidebarsConfig = {
    docsSidebar: [
        {
            type: "doc",
            id: "intro",
            label: "Welcome",
        },
        {
            type: "doc",
            id: "what-is-nats",
            label: "What is NATS?",
        },
        {
            type: "doc",
            id: "ecosystem",
            label: "The NATS Ecosystem",
        },
        {
            type: "doc",
            id: "getting-started/index",
            label: "Getting Started",
        },
        {
            type: "category",
            label: "Core Concepts",
            collapsed: false,
            items: [
                "concepts/pub-sub-basics",
                "concepts/subjects",
                "concepts/request-reply",
                "concepts/queue-groups",
                "concepts/jetstream",
                "concepts/topologies",
                "concepts/security",
            ],
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
};

export default sidebars;
