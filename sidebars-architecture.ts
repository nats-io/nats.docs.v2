import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Sidebar for the 'architecture' docs plugin instance.
 *
 * Architecture is the expert layer: how to design NATS systems that hold up
 * in production. It's written for architects and for AI assistants, so pages
 * are declarative, templated by type, and rules carry stable IDs.
 *
 * Groups (each a collapsible category whose label links to its index page):
 *   Foundations              mental model, coming-from-X maps, misconceptions
 *   Rules                    numbered imperative rules (SUBJ-, STRM-, CONS-, ...)
 *   Decisions                one question per page, default + when to deviate
 *   Patterns                 reusable designs (messaging / persistence / state / integration)
 *   Anti-patterns            designs to unlearn
 *   Topologies               sized deployment blueprints
 *   Reference architectures  end-to-end designs by use case
 *   Practices                cross-cutting production guidance
 *
 * Hand-authored (like sidebars-learn.ts). Page order is the explicit items
 * order below. Page templates and authoring rules live in
 * architecture/_authoring.md (underscore-prefixed, so excluded from the build).
 * The sidebar key MUST stay `architectureSidebar` to match the navbar item in
 * docusaurus.config.ts.
 */
const sidebars: SidebarsConfig = {
  architectureSidebar: [
    { type: "doc", id: "index", label: "Architecture" },
    { type: "doc", id: "using-with-ai", label: "Use with an AI assistant" },
    {
      type: "category",
      label: "Foundations",
      link: { type: "doc", id: "foundations/index" },
      items: [
        "foundations/think-in-nats",
        "foundations/coming-from-kafka",
        "foundations/coming-from-rabbitmq",
        "foundations/coming-from-a-database",
        "foundations/coming-from-http",
        "foundations/misconceptions",
      ],
    },
    {
      type: "category",
      label: "Rules",
      link: { type: "doc", id: "rules/index" },
      items: [
        "rules/subjects",
        "rules/core-messaging",
        "rules/streams",
        "rules/consumers",
        "rules/key-value-and-object-store",
        "rules/topology",
        "rules/security",
        "rules/clients",
        "rules/operations",
      ],
    },
    {
      type: "category",
      label: "Decisions",
      link: { type: "doc", id: "decisions/index" },
      items: [
        "decisions/core-or-jetstream",
        "decisions/consumer-type",
        "decisions/replication-factor",
        "decisions/stream-layout",
        "decisions/kv-stream-or-object-store",
        "decisions/cluster-supercluster-or-leaf",
        "decisions/accounts-and-tenancy",
        "decisions/auth-model",
      ],
    },
    {
      type: "category",
      label: "Patterns",
      link: { type: "doc", id: "patterns/index" },
      items: [
        {
          type: "category",
          label: "Messaging",
          link: { type: "doc", id: "patterns/messaging/index" },
          items: [
            "patterns/messaging/request-reply-services",
            "patterns/messaging/queue-groups",
            "patterns/messaging/fan-out",
            "patterns/messaging/scatter-gather",
            "patterns/messaging/subject-hierarchies",
          ],
        },
        {
          type: "category",
          label: "Persistence",
          link: { type: "doc", id: "patterns/persistence/index" },
          items: [
            "patterns/persistence/event-log",
            "patterns/persistence/durable-work-queue",
            "patterns/persistence/exactly-once-processing",
            "patterns/persistence/ordered-processing",
            "patterns/persistence/retry-and-dead-letter",
            "patterns/persistence/replay-and-reprocessing",
            "patterns/persistence/aggregation-with-sources",
          ],
        },
        {
          type: "category",
          label: "State",
          link: { type: "doc", id: "patterns/state/index" },
          items: [
            "patterns/state/configuration-distribution",
            "patterns/state/leader-election",
            "patterns/state/workflow-state",
            "patterns/state/materialized-views",
          ],
        },
        {
          type: "category",
          label: "Integration",
          link: { type: "doc", id: "patterns/integration/index" },
          items: [
            "patterns/integration/large-payloads",
            "patterns/integration/subject-mapping-and-versioning",
            "patterns/integration/cross-account-sharing",
            "patterns/integration/external-bridges",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Anti-patterns",
      link: { type: "doc", id: "anti-patterns/index" },
      items: [
        "anti-patterns/core-nats-for-durable-delivery",
        "anti-patterns/partition-thinking",
        "anti-patterns/stream-per-entity",
        "anti-patterns/r1-in-production",
        "anti-patterns/push-consumers-by-default",
        "anti-patterns/wildcard-firehose-consumers",
        "anti-patterns/request-reply-through-jetstream",
        "anti-patterns/polling-kv",
        "anti-patterns/ack-before-side-effect",
        "anti-patterns/unbounded-streams",
        "anti-patterns/stretched-cluster",
        "anti-patterns/one-account-for-everything",
      ],
    },
    {
      type: "category",
      label: "Topologies",
      link: { type: "doc", id: "topologies/index" },
      items: [
        "topologies/single-cluster",
        "topologies/multi-region-supercluster",
        "topologies/edge-fleet-with-leaf-nodes",
        "topologies/hub-and-spoke",
        "topologies/hybrid-cloud",
        "topologies/multi-tenant-platform",
        "topologies/internet-facing-ingress",
        "topologies/jetstream-placement",
      ],
    },
    {
      type: "category",
      label: "Reference architectures",
      link: { type: "doc", id: "reference-architectures/index" },
      items: [
        "reference-architectures/order-processing",
        "reference-architectures/microservices-backbone",
        "reference-architectures/iot-telemetry",
        "reference-architectures/multi-region-saas",
        "reference-architectures/realtime-web-app",
        "reference-architectures/market-data-fanout",
        "reference-architectures/data-pipeline-ingest",
        "reference-architectures/job-scheduling",
      ],
    },
    {
      type: "category",
      label: "Practices",
      link: { type: "doc", id: "practices/index" },
      items: [
        "practices/naming-conventions",
        "practices/capacity-and-sizing",
        "practices/environments-and-tenancy",
        "practices/observability-strategy",
        "practices/evolving-subjects-and-schemas",
        "practices/production-readiness",
      ],
    },
  ],
};

export default sidebars;
