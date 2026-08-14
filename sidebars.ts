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
            id: "concepts/intro",
            label: "Welcome",
        },
        {
            type: "doc",
            id: "concepts/what-is-nats",
            label: "What is NATS?",
        },
        {
            type: "doc",
            id: "concepts/ecosystem",
            label: "The NATS Ecosystem",
        },
        {
            type: "doc",
            id: "concepts/getting-started/index",
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
    releaseNotesSidebar: [
        {
            type: "doc",
            id: "release-notes/index",
            label: "Overview",
        },
        "release-notes/upgrade-to-2.14",
        "release-notes/upgrade-to-2.12",
    ],
};

export default sidebars;
