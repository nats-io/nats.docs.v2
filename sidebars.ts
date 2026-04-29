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
            id: "getting-started/index",
            label: "Getting Started",
        },
        {
            type: "category",
            label: "Concepts",
            collapsed: false,
            items: [
                {
                    type: "category",
                    label: "Messaging",
                    collapsed: false,
                    items: [
                        "concepts/pub-sub-basics",
                        "concepts/subjects",
                        "concepts/request-reply",
                        "concepts/queue-groups",
                    ],
                },
                {
                    type: "category",
                    label: "JetStream",
                    collapsed: false,
                    items: [
                        {
                            type: "doc",
                            id: "concepts/jetstream",
                            label: "Streams",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Topology",
                    collapsed: false,
                    items: [
                        {
                            type: "doc",
                            id: "concepts/topologies",
                            label: "Single Server",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Security",
                    collapsed: false,
                    items: [
                        {
                            type: "doc",
                            id: "concepts/security",
                            label: "Passwords and Tokens",
                        },
                    ],
                },
            ],
        },
        {
            type: "category",
            label: "JetStream",
            collapsed: true,
            items: [
                "jetstream/overview",
                "jetstream/streams",
                "jetstream/consumers",
                "jetstream/key-value",
                "jetstream/object-store",
                "jetstream/retention-and-limits",
                "jetstream/replication",
                "jetstream/mirrors-and-sources",
            ],
        },
        {
            type: "category",
            label: "Deployment & Topologies",
            collapsed: true,
            items: [
                "deployment/overview",
                "deployment/single-server",
                "deployment/cluster",
                "deployment/supercluster",
                "deployment/leaf-nodes",
                "deployment/routing-and-connectivity",
                "deployment/choosing-a-topology",
            ],
        },
        {
            type: "category",
            label: "Security",
            collapsed: true,
            items: [
                "security/overview",
                "security/tokens",
                "security/user-password",
                "security/nkeys",
                "security/jwt-decentralized",
                "security/tls-mtls",
                "security/auth-callout",
                "security/authorization",
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
