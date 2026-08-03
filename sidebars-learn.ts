import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Sidebar for the 'learn' docs plugin instance.
 *
 * Learn holds long-form deep dives, organized into two halves:
 *   - Develop — building applications with NATS (Core NATS + JetStream families)
 *   - Operate — running, scaling, and securing NATS
 *
 * Unlike the reference sidebar (generated per-version by
 * scripts/generate-version.js), this sidebar is authored by hand.
 *
 * Conventions:
 * - Each deep dive lives in learn/<chapter>/ and is its own collapsible
 *   category whose label links to that chapter's index page.
 * - Page order is the explicit `items` order below, not _category_.json.
 *
 * The chapters are hand-curated; there is no generator for this section.
 * Shared continuity canon: the pinned Acme ORDERS scenario, cluster name
 * `east`, server names `n1-east`/`n2-east`/`n3-east` (enforced by
 * .claude/workflows/consistency-check.mjs).
 *
 * Status: all fourteen chapters are written — Develop (Core NATS, Services,
 * JetStream, Resilient Clients, Key-Value, Object Store) and Operate
 * (Topologies, Security, Clustering, Monitoring, Backup & Recovery,
 * Deployment, MQTT, WebSocket). Each page follows the deep-dive conventions:
 * pinned Acme ORDERS scenario, nats-example divs + committed CLI snippets,
 * animated NatsFlow scenarios, per-page Pitfalls, and a Production checklist
 * in each where-next.
 *
 * Exception: Topologies, MQTT and WebSocket use inline config and CLI blocks
 * rather than nats-example divs. Their subject matter is server configuration
 * and operational commands rather than client-library calls, which is what the
 * multi-language example system exists to show.
 */
const sidebars: SidebarsConfig = {
  learnSidebar: [
    {
      type: "doc",
      id: "index",
      label: "Learn",
    },
    {
      type: "category",
      label: "Develop",
      collapsed: false,
      items: [
        {
          type: "category",
          label: "Core NATS",
          link: { type: "doc", id: "core-nats/index" },
          items: [
            "core-nats/connecting",
            "core-nats/publish-subscribe",
            "core-nats/subjects-and-wildcards",
            "core-nats/request-reply",
            "core-nats/queue-groups",
            "core-nats/scatter-gather",
            "core-nats/headers",
            "core-nats/subject-mapping",
            "core-nats/connection-lifecycle",
            "core-nats/debugging-delivery",
            "core-nats/where-next",
          ],
        },
        {
          type: "category",
          label: "Services",
          link: { type: "doc", id: "services/index" },
          items: [
            "services/your-first-service",
            "services/endpoints-and-groups",
            "services/discovery",
            "services/observability",
            "services/scaling",
            "services/where-next",
          ],
        },
        {
          type: "category",
          label: "JetStream",
          link: { type: "doc", id: "jetstream/index" },
          items: [
            "jetstream/your-first-stream",
            "jetstream/publishing",
            "jetstream/reading-back",
            "jetstream/filtering",
            "jetstream/delivery-and-acknowledgment",
            "jetstream/acknowledgment",
            "jetstream/pull-consumers",
            "jetstream/worker-pool",
            "jetstream/ordered-consumer",
            "jetstream/priority-groups",
            "jetstream/pausing",
            "jetstream/shaping-the-stream",
            "jetstream/retention-policies",
            "jetstream/altering-stream-state",
            "jetstream/surviving-node-loss",
            "jetstream/advanced-publishing",
            "jetstream/mirrors-and-sources",
            "jetstream/get-direct",
            "jetstream/subject-mapping",
            "jetstream/message-ttl",
            "jetstream/policies",
            "jetstream/where-next",
          ],
        },
        {
          type: "category",
          label: "Resilient Clients",
          link: { type: "doc", id: "resilient-clients/index" },
          items: [
            "resilient-clients/connecting",
            "resilient-clients/reconnection",
            "resilient-clients/connection-events",
            "resilient-clients/drain-and-shutdown",
            "resilient-clients/slow-consumers",
            "resilient-clients/request-reply-resilience",
            "resilient-clients/tls-and-auth",
            "resilient-clients/where-next",
          ],
        },
        {
          type: "category",
          label: "Key-Value Store",
          link: { type: "doc", id: "key-value/index" },
          items: [
            "key-value/your-first-bucket",
            "key-value/watching",
            "key-value/history-and-revisions",
            "key-value/ttl-and-limits",
            "key-value/under-the-hood",
            "key-value/where-next",
          ],
        },
        {
          type: "category",
          label: "Object Store",
          link: { type: "doc", id: "object-store/index" },
          items: [
            "object-store/your-first-object",
            "object-store/chunking",
            "object-store/metadata-and-links",
            "object-store/watching-and-listing",
            "object-store/under-the-hood",
            "object-store/where-next",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Operate",
      collapsed: false,
      items: [
        {
          type: "category",
          label: "Topologies",
          link: { type: "doc", id: "topologies/index" },
          items: [
            "topologies/single-server",
            "topologies/your-first-cluster",
            "topologies/jetstream-in-a-cluster",
            "topologies/super-clusters",
            "topologies/leaf-nodes",
            "topologies/putting-it-together",
            "topologies/where-next",
          ],
        },
        {
          type: "category",
          label: "Security",
          link: { type: "doc", id: "security/index" },
          items: [
            "security/authentication-basics",
            "security/authorization",
            "security/accounts-and-multitenancy",
            "security/cross-account",
            "security/operator-mode",
            "security/decentralized-auth",
            "security/auth-callout",
            "security/encryption",
            "security/where-next",
          ],
        },
        {
          type: "category",
          label: "Clustering & Replication",
          link: { type: "doc", id: "clustering/index" },
          items: [
            "clustering/forming-a-cluster",
            "clustering/raft-and-leaders",
            "clustering/replication-and-r3",
            "clustering/placement",
            "clustering/scaling-and-peers",
            "clustering/where-next",
          ],
        },
        {
          type: "category",
          label: "Monitoring & Observability",
          link: { type: "doc", id: "monitoring/index" },
          items: [
            "monitoring/monitoring-endpoints",
            "monitoring/jetstream-health",
            "monitoring/advisories-and-events",
            "monitoring/prometheus-and-dashboards",
            "monitoring/where-next",
          ],
        },
        {
          type: "category",
          label: "Backup & Recovery",
          link: { type: "doc", id: "backup-recovery/index" },
          items: [
            "backup-recovery/stream-backup-restore",
            "backup-recovery/mirrors-and-sources",
            "backup-recovery/disaster-recovery",
            "backup-recovery/config-and-jwt-backup",
            "backup-recovery/where-next",
          ],
        },
        {
          type: "category",
          label: "Deployment & Upgrades",
          link: { type: "doc", id: "deployment/index" },
          items: [
            "deployment/sizing-and-resources",
            "deployment/kubernetes",
            "deployment/config-management",
            "deployment/rolling-upgrades",
            "deployment/hardening",
            "deployment/where-next",
          ],
        },
        {
          type: "category",
          label: "MQTT",
          link: { type: "doc", id: "mqtt/index" },
          items: [
            "mqtt/your-first-mqtt-client",
            "mqtt/topics-and-subjects",
            "mqtt/qos-sessions-and-retained",
            "mqtt/auth-and-clustering",
            "mqtt/where-next",
          ],
        },
        {
          type: "category",
          label: "WebSocket",
          link: { type: "doc", id: "websocket/index" },
          items: [
            "websocket/your-first-websocket-connection",
            "websocket/browsers-and-origins",
            "websocket/tls-and-proxies",
            "websocket/leaf-nodes-over-websocket",
            "websocket/where-next",
          ],
        },
      ],
    },
  ],
};

export default sidebars;
