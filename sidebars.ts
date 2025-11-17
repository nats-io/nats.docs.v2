import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";
import configSidebar from "./config-sidebar.json";

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
            label: "Core Concepts",
            collapsed: false,
            items: [
                "concepts/pub-sub-basics",
                "concepts/subjects",
                "concepts/request-reply",
                "concepts/queue-groups",
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

    referenceSidebar: [
        {
            type: "doc",
            id: "reference/index",
            label: "Reference",
        },
        configSidebar,
        {
            type: "category",
            label: "JetStream",
            collapsed: true,
            link: {
                type: "doc",
                id: "reference/jetstream/index",
            },
            items: [
                {
                    type: "category",
                    label: "API",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/jetstream/api/index",
                    },
                    items: [
                        {
                            type: "category",
                            label: "Account",
                            collapsed: true,
                            link: {
                                type: "doc",
                                id: "reference/jetstream/api/account/index",
                            },
                            items: [
                                "reference/jetstream/api/account/info",
                                "reference/jetstream/api/account/purge",
                            ],
                        },
                        {
                            type: "category",
                            label: "Stream",
                            collapsed: true,
                            link: {
                                type: "doc",
                                id: "reference/jetstream/api/stream/index",
                            },
                            items: [
                                "reference/jetstream/api/stream/create",
                                "reference/jetstream/api/stream/delete",
                                "reference/jetstream/api/stream/info",
                                "reference/jetstream/api/stream/leader-stepdown",
                                "reference/jetstream/api/stream/list",
                                "reference/jetstream/api/stream/msg-delete",
                                "reference/jetstream/api/stream/msg-get",
                                "reference/jetstream/api/stream/names",
                                "reference/jetstream/api/stream/purge",
                                "reference/jetstream/api/stream/remove-peer",
                                "reference/jetstream/api/stream/restore",
                                "reference/jetstream/api/stream/snapshot",
                                "reference/jetstream/api/stream/update",
                                "reference/jetstream/api/stream/pub-ack",
                            ],
                        },
                        {
                            type: "category",
                            label: "Consumer",
                            collapsed: true,
                            link: {
                                type: "doc",
                                id: "reference/jetstream/api/consumer/index",
                            },
                            items: [
                                "reference/jetstream/api/consumer/create",
                                "reference/jetstream/api/consumer/delete",
                                "reference/jetstream/api/consumer/get-next",
                                "reference/jetstream/api/consumer/info",
                                "reference/jetstream/api/consumer/leader-stepdown",
                                "reference/jetstream/api/consumer/list",
                                "reference/jetstream/api/consumer/names",
                                "reference/jetstream/api/consumer/pause",
                                "reference/jetstream/api/consumer/unpin",
                            ],
                        },
                        {
                            type: "category",
                            label: "Meta",
                            collapsed: true,
                            link: {
                                type: "doc",
                                id: "reference/jetstream/api/meta/index",
                            },
                            items: [
                                "reference/jetstream/api/meta/leader-stepdown",
                                "reference/jetstream/api/meta/server-remove",
                            ],
                        },
                        {
                            type: "doc",
                            label: "Headers",
                            id: "reference/jetstream/api/headers",
                        },
                    ],
                },
                {
                    type: "category",
                    label: "Advisories",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/jetstream/advisory/index",
                    },
                    items: [
                        "reference/jetstream/advisory/api-audit",
                        "reference/jetstream/advisory/api-limit-reached",
                        "reference/jetstream/advisory/consumer-action",
                        "reference/jetstream/advisory/consumer-group-pinned",
                        "reference/jetstream/advisory/consumer-group-unpinned",
                        "reference/jetstream/advisory/consumer-leader-elected",
                        "reference/jetstream/advisory/consumer-pause",
                        "reference/jetstream/advisory/consumer-quorum-lost",
                        "reference/jetstream/advisory/domain-leader-elected",
                        "reference/jetstream/advisory/max-deliver",
                        "reference/jetstream/advisory/nak",
                        "reference/jetstream/advisory/restore-complete",
                        "reference/jetstream/advisory/restore-create",
                        "reference/jetstream/advisory/server-out-of-space",
                        "reference/jetstream/advisory/server-removed",
                        "reference/jetstream/advisory/snapshot-complete",
                        "reference/jetstream/advisory/snapshot-create",
                        "reference/jetstream/advisory/stream-action",
                        "reference/jetstream/advisory/stream-leader-elected",
                        "reference/jetstream/advisory/stream-quorum-lost",
                        "reference/jetstream/advisory/terminated",
                    ],
                },
                {
                    type: "category",
                    label: "Metric",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/jetstream/metric/index",
                    },
                    items: ["reference/jetstream/metric/consumer-ack"],
                },
                {
                    type: "doc",
                    label: "Errors",
                    id: "reference/jetstream/errors",
                },
            ],
        },
        {
            type: "category",
            label: "System",
            collapsed: true,
            link: {
                type: "doc",
                id: "reference/system/index",
            },
            items: [
                {
                    type: "category",
                    label: "Advisory",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/system/advisory/index",
                    },
                    items: [
                        "reference/system/advisory/account-connections",
                        "reference/system/advisory/client-connect",
                        "reference/system/advisory/client-disconnect",
                    ],
                },
                {
                    type: "category",
                    label: "Metric",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/system/metric/index",
                    },
                    items: ["reference/system/metric/service-latency"],
                },
                {
                    type: "category",
                    label: "Monitoring",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "reference/system/monitor/index",
                    },
                    items: [
                        "reference/system/monitor/varz",
                        "reference/system/monitor/connz",
                        "reference/system/monitor/subsz",
                        "reference/system/monitor/routez",
                        "reference/system/monitor/gatewayz",
                        "reference/system/monitor/leafz",
                        "reference/system/monitor/accountz",
                        "reference/system/monitor/accstatz",
                        "reference/system/monitor/jsz",
                        "reference/system/monitor/healthz",
                        "reference/system/monitor/statsz",
                        "reference/system/monitor/ipqueuesz",
                        "reference/system/monitor/idz",
                        "reference/system/monitor/profilez",
                        "reference/system/monitor/raftz",
                    ],
                },
                {
                    type: "doc",
                    label: "Errors",
                    id: "reference/system/errors",
                },
            ],
        },
        {
            type: "category",
            label: "Services",
            collapsed: true,
            link: {
                type: "doc",
                id: "reference/services/index",
            },
            items: [
                "reference/services/info-response",
                "reference/services/ping-response",
                "reference/services/stats-response",
            ],
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
