#!/usr/bin/env node

/**
 * Script to fetch code examples from NATS client repositories
 * This allows us to keep documentation in sync with actual client examples
 */

const fs = require("fs").promises;
const path = require("path");
const https = require("https");

// Configuration for NATS client repositories and example paths
// All examples use pattern: [page]-[snippet]
// Go: examples/docs/[page]-[snippet]/main.go
// Rust: async-nats/examples/docs_[page]_[snippet].rs
// Others: TBD when they adopt the pattern
const EXAMPLES_CONFIG = {
    "go": [{
        repo: "nats-io/nats.go",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "basics-publish": "basics-publish/main.go",
            "basics-subscribe": "basics-subscribe/main.go",
            "getting-started-publish": "getting-started-publish/main.go",
            "getting-started-subscribe": "getting-started-subscribe/main.go",
            "subjects-single-wildcard": "subjects-single-wildcard/main.go",
            "subjects-multi-wildcard": "subjects-multi-wildcard/main.go",
            "subjects-monitoring": "subjects-monitoring/main.go",
            "queue-groups-basic": "queue-groups-basic/main.go",
            "queue-groups-dynamic-scaling": "queue-groups-dynamic-scaling/main.go",
            "queue-groups-request-reply": "queue-groups-request-reply/main.go",
            "queue-groups-mixed-subscribers": "queue-groups-mixed-subscribers/main.go",
            "request-reply-basic": "request-reply-basic/main.go",
            "request-reply-timeout": "request-reply-timeout/main.go",
            "request-reply-multiple-responders": "request-reply-multiple-responders/main.go",
            "request-reply-no-responders": "request-reply-no-responders/main.go",
            "request-reply-headers": "request-reply-headers/main.go",
            "request-reply-calculator": "request-reply-calculator/main.go",
            "jetstream-basic": "jetstream-basic/main.go"
        },
    }, {
        repo: "nats-io/nats.go",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "learn-core-nats-publish-subscribe-publish/main.go",
            "learn-core-nats-publish-subscribe-subscribe": "learn-core-nats-publish-subscribe-subscribe/main.go",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "learn-core-nats-subjects-and-wildcards-wildcard-single/main.go",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "learn-core-nats-subjects-and-wildcards-wildcard-multi/main.go",
            "learn-core-nats-request-reply-respond": "learn-core-nats-request-reply-respond/main.go",
            "learn-core-nats-request-reply-request": "learn-core-nats-request-reply-request/main.go",
            "learn-core-nats-request-reply-replies": "learn-core-nats-request-reply-replies/main.go",
            "learn-core-nats-queue-groups-queue-subscribe": "learn-core-nats-queue-groups-queue-subscribe/main.go",
            "learn-core-nats-scatter-gather-provider": "learn-core-nats-scatter-gather-provider/main.go",
            "learn-core-nats-scatter-gather-gather": "learn-core-nats-scatter-gather-gather/main.go",
        },
    }, {
        repo: "nats-io/nats.go",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "learn-jetstream-your-first-stream-create": "learn-jetstream-your-first-stream-create/main.go",
            "learn-jetstream-your-first-stream-info": "learn-jetstream-your-first-stream-info/main.go",
            "learn-jetstream-mirrors-and-sources-createMirror": "learn-jetstream-mirrors-and-sources-createMirror/main.go",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "learn-jetstream-mirrors-and-sources-mirrorLag/main.go",
            "learn-jetstream-mirrors-and-sources-createSource": "learn-jetstream-mirrors-and-sources-createSource/main.go",
            "learn-jetstream-get-direct-by-sequence": "learn-jetstream-get-direct-by-sequence/main.go",
            "learn-jetstream-get-direct-last-for-subject": "learn-jetstream-get-direct-last-for-subject/main.go",
            "learn-jetstream-get-direct-enable": "learn-jetstream-get-direct-enable/main.go",
            "learn-jetstream-get-direct-direct-read": "learn-jetstream-get-direct-direct-read/main.go",
            "learn-jetstream-subject-mapping-transform": "learn-jetstream-subject-mapping-transform/main.go",
            "learn-jetstream-subject-mapping-republish": "learn-jetstream-subject-mapping-republish/main.go",
            "learn-jetstream-message-ttl-publishWithTtl": "learn-jetstream-message-ttl-publishWithTtl/main.go",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "learn-jetstream-message-ttl-ttl-on-disabled-stream/main.go",
            "learn-jetstream-publishing-sync": "learn-jetstream-publishing-sync/main.go",
            "learn-jetstream-advanced-publishing-async": "learn-jetstream-advanced-publishing-async/main.go",
            "learn-jetstream-publishing-dedup": "learn-jetstream-publishing-dedup/main.go",
            "learn-jetstream-publishing-confirmStored": "learn-jetstream-publishing-confirmStored/main.go",
            "learn-jetstream-reading-back-create": "learn-jetstream-reading-back-create/main.go",
            "learn-jetstream-reading-back-read": "learn-jetstream-reading-back-read/main.go",
            "learn-jetstream-your-first-consumer-create": "learn-jetstream-your-first-consumer-create/main.go",
            "learn-jetstream-your-first-consumer-pullAndAck": "learn-jetstream-your-first-consumer-pullAndAck/main.go",
            "learn-jetstream-your-first-consumer-next": "learn-jetstream-your-first-consumer-next/main.go",
            "learn-jetstream-your-first-consumer-doubleAck": "learn-jetstream-your-first-consumer-doubleAck/main.go",
            "learn-jetstream-acknowledgment-nakWithDelay": "learn-jetstream-acknowledgment-nakWithDelay/main.go",
            "learn-jetstream-acknowledgment-termPoison": "learn-jetstream-acknowledgment-termPoison/main.go",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "learn-jetstream-acknowledgment-watchMaxDeliveries/main.go",
            "learn-jetstream-filtering-createFiltered": "learn-jetstream-filtering-createFiltered/main.go",
            "learn-jetstream-filtering-filterMatchesNothing": "learn-jetstream-filtering-filterMatchesNothing/main.go",
            "learn-jetstream-worker-pool-worker": "learn-jetstream-worker-pool-worker/main.go",
            "learn-jetstream-pull-consumers-fetchBatch": "learn-jetstream-pull-consumers-fetchBatch/main.go",
            "learn-jetstream-pull-consumers-consumeContinuous": "learn-jetstream-pull-consumers-consumeContinuous/main.go",
            "learn-jetstream-pull-consumers-emptyFetch": "learn-jetstream-pull-consumers-emptyFetch/main.go",
            "learn-jetstream-ordered-consumer-read": "learn-jetstream-ordered-consumer-read/main.go",
            "learn-jetstream-shaping-the-stream-setLimits": "learn-jetstream-shaping-the-stream-setLimits/main.go",
            "learn-jetstream-shaping-the-stream-discardNew": "learn-jetstream-shaping-the-stream-discardNew/main.go",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "learn-jetstream-shaping-the-stream-perSubjectLimit/main.go",
            "learn-jetstream-retention-policies-workQueueCreate": "learn-jetstream-retention-policies-workQueueCreate/main.go",
            "learn-jetstream-retention-policies-workqueueOverlap": "learn-jetstream-retention-policies-workqueueOverlap/main.go",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "learn-jetstream-retention-policies-retentionSwitchRejected/main.go",
        },
    }, {
        repo: "synadia-io/orbit.go",
        branch: "main",
        directory: "jetstreamext/examples/",
        examples: {
            "learn-jetstream-advanced-publishing-atomic": "atomicbatchdocs/main.go",
            "learn-jetstream-get-direct-batch-get": "learn-jetstream-get-direct-batch-get/main.go",
        },
    }],
    "rust": [{
        repo: "nats-io/nats.rs",
        branch: "main",
        directory: "async-nats/examples/",
        examples: {
            "basics-publish": "docs_basics_publish.rs",
            "basics-subscribe": "docs_basics_subscribe.rs",
            "getting-started-publish": "docs_getting_started_publish.rs",
            "getting-started-subscribe": "docs_getting_started_subscribe.rs",
            "subjects-single-wildcard": "docs_subjects_single_wildcard.rs",
            "subjects-multi-wildcard": "docs_subjects_multi_wildcard.rs",
            "subjects-monitoring": "docs_subjects_monitoring.rs",
            "queue-groups-basic": "docs_queue_groups_basic.rs",
            "queue-groups-dynamic-scaling": "docs_queue_groups_dynamic_scaling.rs",
            "queue-groups-request-reply": "docs_queue_groups_request_reply.rs",
            "queue-groups-mixed-subscribers": "docs_queue_groups_mixed_subscribers.rs",
            "request-reply-basic": "docs_request_reply_basic.rs",
            "request-reply-timeout": "docs_request_reply_timeout.rs",
            "request-reply-multiple-responders": "docs_request_reply_multiple_responders.rs",
            "request-reply-no-responders": "docs_request_reply_no_responders.rs",
            "request-reply-headers": "docs_request_reply_headers.rs",
            "request-reply-calculator": "docs_request_reply_calculator.rs",
            "jetstream-basic": "docs_jetstream_basic.rs"
        },
    }, {
        repo: "nats-io/nats.rs",
        branch: "main",
        directory: "async-nats/examples/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "docs_learn_core_nats_publish_subscribe_publish.rs",
            "learn-core-nats-publish-subscribe-subscribe": "docs_learn_core_nats_publish_subscribe_subscribe.rs",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "docs_learn_core_nats_subjects_and_wildcards_wildcard_single.rs",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "docs_learn_core_nats_subjects_and_wildcards_wildcard_multi.rs",
            "learn-core-nats-request-reply-respond": "docs_learn_core_nats_request_reply_respond.rs",
            "learn-core-nats-request-reply-request": "docs_learn_core_nats_request_reply_request.rs",
            "learn-core-nats-request-reply-replies": "docs_learn_core_nats_request_reply_replies.rs",
            "learn-core-nats-queue-groups-queue-subscribe": "docs_learn_core_nats_queue_groups_queue_subscribe.rs",
            "learn-core-nats-scatter-gather-provider": "docs_learn_core_nats_scatter_gather_provider.rs",
            "learn-core-nats-scatter-gather-gather": "docs_learn_core_nats_scatter_gather_gather.rs",
        },
    }, {
        repo: "nats-io/nats.rs",
        branch: "main",
        directory: "async-nats/examples/",
        examples: {
            "learn-jetstream-your-first-stream-create": "docs_learn_jetstream_your_first_stream_create.rs",
            "learn-jetstream-your-first-stream-info": "docs_learn_jetstream_your_first_stream_info.rs",
            "learn-jetstream-mirrors-and-sources-createMirror": "docs_learn_jetstream_mirrors_and_sources_create_mirror.rs",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "docs_learn_jetstream_mirrors_and_sources_mirror_lag.rs",
            "learn-jetstream-mirrors-and-sources-createSource": "docs_learn_jetstream_mirrors_and_sources_create_source.rs",
            "learn-jetstream-get-direct-by-sequence": "docs_learn_jetstream_get_direct_by_sequence.rs",
            "learn-jetstream-get-direct-last-for-subject": "docs_learn_jetstream_get_direct_last_for_subject.rs",
            "learn-jetstream-get-direct-enable": "docs_learn_jetstream_get_direct_enable.rs",
            "learn-jetstream-get-direct-direct-read": "docs_learn_jetstream_get_direct_direct_read.rs",
            "learn-jetstream-subject-mapping-transform": "docs_learn_jetstream_subject_mapping_transform.rs",
            "learn-jetstream-subject-mapping-republish": "docs_learn_jetstream_subject_mapping_republish.rs",
            "learn-jetstream-message-ttl-publishWithTtl": "docs_learn_jetstream_message_ttl_publish_with_ttl.rs",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "docs_learn_jetstream_message_ttl_ttl_on_disabled_stream.rs",
            "learn-jetstream-publishing-sync": "docs_learn_jetstream_publishing_sync.rs",
            "learn-jetstream-advanced-publishing-async": "docs_learn_jetstream_advanced_publishing_async.rs",
            "learn-jetstream-publishing-dedup": "docs_learn_jetstream_publishing_dedup.rs",
            "learn-jetstream-publishing-confirmStored": "docs_learn_jetstream_publishing_confirm_stored.rs",
            "learn-jetstream-reading-back-create": "docs_learn_jetstream_reading_back_create.rs",
            "learn-jetstream-reading-back-read": "docs_learn_jetstream_reading_back_read.rs",
            "learn-jetstream-your-first-consumer-create": "docs_learn_jetstream_your_first_consumer_create.rs",
            "learn-jetstream-your-first-consumer-pullAndAck": "docs_learn_jetstream_your_first_consumer_pull_and_ack.rs",
            "learn-jetstream-your-first-consumer-next": "docs_learn_jetstream_your_first_consumer_next.rs",
            "learn-jetstream-your-first-consumer-doubleAck": "docs_learn_jetstream_your_first_consumer_double_ack.rs",
            "learn-jetstream-acknowledgment-nakWithDelay": "docs_learn_jetstream_acknowledgment_nak_with_delay.rs",
            "learn-jetstream-acknowledgment-termPoison": "docs_learn_jetstream_acknowledgment_term_poison.rs",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "docs_learn_jetstream_acknowledgment_watch_max_deliveries.rs",
            "learn-jetstream-filtering-createFiltered": "docs_learn_jetstream_filtering_create_filtered.rs",
            "learn-jetstream-filtering-filterMatchesNothing": "docs_learn_jetstream_filtering_filter_matches_nothing.rs",
            "learn-jetstream-worker-pool-worker": "docs_learn_jetstream_worker_pool_worker.rs",
            "learn-jetstream-pull-consumers-fetchBatch": "docs_learn_jetstream_pull_consumers_fetch_batch.rs",
            "learn-jetstream-pull-consumers-consumeContinuous": "docs_learn_jetstream_pull_consumers_consume_continuous.rs",
            "learn-jetstream-pull-consumers-emptyFetch": "docs_learn_jetstream_pull_consumers_empty_fetch.rs",
            "learn-jetstream-ordered-consumer-read": "docs_learn_jetstream_ordered_consumer_read.rs",
            "learn-jetstream-shaping-the-stream-setLimits": "docs_learn_jetstream_shaping_the_stream_set_limits.rs",
            "learn-jetstream-shaping-the-stream-discardNew": "docs_learn_jetstream_shaping_the_stream_discard_new.rs",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "docs_learn_jetstream_shaping_the_stream_per_subject_limit.rs",
            "learn-jetstream-retention-policies-workQueueCreate": "docs_learn_jetstream_retention_policies_work_queue_create.rs",
            "learn-jetstream-retention-policies-workqueueOverlap": "docs_learn_jetstream_retention_policies_workqueue_overlap.rs",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "docs_learn_jetstream_retention_policies_retention_switch_rejected.rs",
        },
    }, {
        repo: "synadia-io/orbit.rs",
        branch: "main",
        directory: "jetstream-extra/examples/",
        examples: {
            "learn-jetstream-advanced-publishing-atomic": "docs_atomic_batch.rs",
            "learn-jetstream-get-direct-batch-get": "docs_learn_jetstream_get_direct_batch_get.rs",
        },
    }],
    "javascript": [{
        repo: "nats-io/nats.js",
        branch: "docs-io-nats-examples",
        directory: "docs-io-nats-examples/",
        examples: {
            "basics-publish": "basics-publish.ts",
            "basics-subscribe": "basics-subscribe.ts",
            "getting-started-publish": "getting-started-publish.ts",
            "getting-started-subscribe": "getting-started-subscribe.ts",
            "subjects-single-wildcard": "subjects-single-wildcard.ts",
            "subjects-multi-wildcard": "subjects-multi-wildcard.ts",
            "subjects-monitoring": "subjects-monitoring.ts",
            "queue-groups-basic": "queue-groups-basic.ts",
            "queue-groups-dynamic-scaling": "queue-groups-dynamic-scaling.ts",
            "queue-groups-request-reply": "queue-groups-request-reply.ts",
            "queue-groups-mixed-subscribers": "queue-groups-mixed-subscribers.ts",
            "request-reply-basic": "request-reply-basic.ts",
            "request-reply-timeout": "request-reply-timeout.ts",
            "request-reply-multiple-responders": "request-reply-multiple-responders.ts",
            "request-reply-no-responders": "request-reply-no-responders.ts",
            "request-reply-headers": "request-reply-headers.ts",
            "request-reply-calculator": "request-reply-calculator.ts",
            "jetstream-basic": "jetstream-basic.ts"
        },
    }, {
        repo: "nats-io/nats.js",
        branch: "core-docs",
        directory: "docs-io-nats-examples/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "learn-core-nats-publish-subscribe-publish.ts",
            "learn-core-nats-publish-subscribe-subscribe": "learn-core-nats-publish-subscribe-subscribe.ts",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "learn-core-nats-subjects-and-wildcards-wildcard-single.ts",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "learn-core-nats-subjects-and-wildcards-wildcard-multi.ts",
            "learn-core-nats-request-reply-respond": "learn-core-nats-request-reply-respond.ts",
            "learn-core-nats-request-reply-request": "learn-core-nats-request-reply-request.ts",
            "learn-core-nats-request-reply-replies": "learn-core-nats-request-reply-replies.ts",
            "learn-core-nats-queue-groups-queue-subscribe": "learn-core-nats-queue-groups-queue-subscribe.ts",
            "learn-core-nats-scatter-gather-provider": "learn-core-nats-scatter-gather-provider.ts",
            "learn-core-nats-scatter-gather-gather": "learn-core-nats-scatter-gather-gather.ts",
        },
    }, {
        repo: "nats-io/nats.js",
        branch: "jetstream-docs",
        directory: "docs-io-nats-examples/",
        examples: {
            "learn-jetstream-your-first-stream-create": "learn-jetstream-your-first-stream-create.ts",
            "learn-jetstream-your-first-stream-info": "learn-jetstream-your-first-stream-info.ts",
            "learn-jetstream-mirrors-and-sources-createMirror": "learn-jetstream-mirrors-and-sources-createMirror.ts",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "learn-jetstream-mirrors-and-sources-mirrorLag.ts",
            "learn-jetstream-mirrors-and-sources-createSource": "learn-jetstream-mirrors-and-sources-createSource.ts",
            "learn-jetstream-get-direct-by-sequence": "learn-jetstream-get-direct-by-sequence.ts",
            "learn-jetstream-get-direct-last-for-subject": "learn-jetstream-get-direct-last-for-subject.ts",
            "learn-jetstream-get-direct-enable": "learn-jetstream-get-direct-enable.ts",
            "learn-jetstream-get-direct-direct-read": "learn-jetstream-get-direct-direct-read.ts",
            "learn-jetstream-get-direct-batch-get": "learn-jetstream-get-direct-batch-get.ts",
            "learn-jetstream-subject-mapping-transform": "learn-jetstream-subject-mapping-transform.ts",
            "learn-jetstream-subject-mapping-republish": "learn-jetstream-subject-mapping-republish.ts",
            "learn-jetstream-message-ttl-publishWithTtl": "learn-jetstream-message-ttl-publishWithTtl.ts",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "learn-jetstream-message-ttl-ttl-on-disabled-stream.ts",
            "learn-jetstream-publishing-sync": "learn-jetstream-publishing-sync.ts",
            "learn-jetstream-advanced-publishing-async": "learn-jetstream-advanced-publishing-async.ts",
            "learn-jetstream-advanced-publishing-atomic": "learn-jetstream-advanced-publishing-atomic.ts",
            "learn-jetstream-publishing-dedup": "learn-jetstream-publishing-dedup.ts",
            "learn-jetstream-publishing-confirmStored": "learn-jetstream-publishing-confirmStored.ts",
            "learn-jetstream-reading-back-create": "learn-jetstream-reading-back-create.ts",
            "learn-jetstream-reading-back-read": "learn-jetstream-reading-back-read.ts",
            "learn-jetstream-your-first-consumer-create": "learn-jetstream-your-first-consumer-create.ts",
            "learn-jetstream-your-first-consumer-pullAndAck": "learn-jetstream-your-first-consumer-pullAndAck.ts",
            "learn-jetstream-your-first-consumer-next": "learn-jetstream-your-first-consumer-next.ts",
            "learn-jetstream-your-first-consumer-doubleAck": "learn-jetstream-your-first-consumer-doubleAck.ts",
            "learn-jetstream-acknowledgment-nakWithDelay": "learn-jetstream-acknowledgment-nakWithDelay.ts",
            "learn-jetstream-acknowledgment-termPoison": "learn-jetstream-acknowledgment-termPoison.ts",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "learn-jetstream-acknowledgment-watchMaxDeliveries.ts",
            "learn-jetstream-filtering-createFiltered": "learn-jetstream-filtering-createFiltered.ts",
            "learn-jetstream-filtering-filterMatchesNothing": "learn-jetstream-filtering-filterMatchesNothing.ts",
            "learn-jetstream-worker-pool-worker": "learn-jetstream-worker-pool-worker.ts",
            "learn-jetstream-pull-consumers-fetchBatch": "learn-jetstream-pull-consumers-fetchBatch.ts",
            "learn-jetstream-pull-consumers-consumeContinuous": "learn-jetstream-pull-consumers-consumeContinuous.ts",
            "learn-jetstream-pull-consumers-emptyFetch": "learn-jetstream-pull-consumers-emptyFetch.ts",
            "learn-jetstream-ordered-consumer-read": "learn-jetstream-ordered-consumer-read.ts",
            "learn-jetstream-shaping-the-stream-setLimits": "learn-jetstream-shaping-the-stream-setLimits.ts",
            "learn-jetstream-shaping-the-stream-discardNew": "learn-jetstream-shaping-the-stream-discardNew.ts",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "learn-jetstream-shaping-the-stream-perSubjectLimit.ts",
            "learn-jetstream-retention-policies-workQueueCreate": "learn-jetstream-retention-policies-workQueueCreate.ts",
            "learn-jetstream-retention-policies-workqueueOverlap": "learn-jetstream-retention-policies-workqueueOverlap.ts",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "learn-jetstream-retention-policies-retentionSwitchRejected.ts",
        },
    }],
    "python": [{
        repo: "nats-io/nats.py",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "basics-publish": "basics_publish.py",
            "basics-subscribe": "basics_subscribe.py",
            "getting-started-publish": "getting_started_publish.py",
            "getting-started-subscribe": "getting_started_subscribe.py",
            "subjects-single-wildcard": "subjects_single_wildcard.py",
            "subjects-multi-wildcard": "subjects_multi_wildcard.py",
            "subjects-monitoring": "subjects_monitoring.py",
            "queue-groups-basic": "queue_groups_basic.py",
            "queue-groups-dynamic-scaling": "queue_groups_dynamic_scaling.py",
            "queue-groups-request-reply": "queue_groups_request_reply.py",
            "queue-groups-mixed-subscribers": "queue_groups_mixed_subscribers.py",
            "request-reply-basic": "request_reply_basic.py",
            "request-reply-timeout": "request_reply_timeout.py",
            "request-reply-multiple-responders": "request_reply_multiple_responders.py",
            "request-reply-no-responders": "request_reply_no_responders.py",
            "request-reply-headers": "request_reply_headers.py",
            "request-reply-calculator": "request_reply_calculator.py",
            "jetstream-basic": "jetstream_basic.py"
        },
    }, {
        repo: "nats-io/nats.py",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "learn-jetstream-your-first-stream-create": "learn_jetstream_your_first_stream_create.py",
            "learn-jetstream-your-first-stream-info": "learn_jetstream_your_first_stream_info.py",
            "learn-jetstream-mirrors-and-sources-createMirror": "learn_jetstream_mirrors_and_sources_create_mirror.py",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "learn_jetstream_mirrors_and_sources_mirror_lag.py",
            "learn-jetstream-mirrors-and-sources-createSource": "learn_jetstream_mirrors_and_sources_create_source.py",
            "learn-jetstream-get-direct-by-sequence": "learn_jetstream_get_direct_by_sequence.py",
            "learn-jetstream-get-direct-last-for-subject": "learn_jetstream_get_direct_last_for_subject.py",
            "learn-jetstream-get-direct-enable": "learn_jetstream_get_direct_enable.py",
            "learn-jetstream-get-direct-direct-read": "learn_jetstream_get_direct_direct_read.py",
            "learn-jetstream-subject-mapping-transform": "learn_jetstream_subject_mapping_transform.py",
            "learn-jetstream-subject-mapping-republish": "learn_jetstream_subject_mapping_republish.py",
            "learn-jetstream-message-ttl-publishWithTtl": "learn_jetstream_message_ttl_publish_with_ttl.py",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "learn_jetstream_message_ttl_ttl_on_disabled_stream.py",
            "learn-jetstream-publishing-sync": "learn_jetstream_publishing_sync.py",
            "learn-jetstream-advanced-publishing-async": "learn_jetstream_advanced_publishing_async.py",
            "learn-jetstream-advanced-publishing-atomic": "learn_jetstream_advanced_publishing_atomic.py",
            "learn-jetstream-publishing-dedup": "learn_jetstream_publishing_dedup.py",
            "learn-jetstream-publishing-confirmStored": "learn_jetstream_publishing_confirm_stored.py",
            "learn-jetstream-reading-back-create": "learn_jetstream_reading_back_create.py",
            "learn-jetstream-reading-back-read": "learn_jetstream_reading_back_read.py",
            "learn-jetstream-your-first-consumer-create": "learn_jetstream_your_first_consumer_create.py",
            "learn-jetstream-your-first-consumer-pullAndAck": "learn_jetstream_your_first_consumer_pull_and_ack.py",
            "learn-jetstream-your-first-consumer-next": "learn_jetstream_your_first_consumer_next.py",
            "learn-jetstream-your-first-consumer-doubleAck": "learn_jetstream_your_first_consumer_double_ack.py",
            "learn-jetstream-acknowledgment-nakWithDelay": "learn_jetstream_acknowledgment_nak_with_delay.py",
            "learn-jetstream-acknowledgment-termPoison": "learn_jetstream_acknowledgment_term_poison.py",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "learn_jetstream_acknowledgment_watch_max_deliveries.py",
            "learn-jetstream-filtering-createFiltered": "learn_jetstream_filtering_create_filtered.py",
            "learn-jetstream-filtering-filterMatchesNothing": "learn_jetstream_filtering_filter_matches_nothing.py",
            "learn-jetstream-worker-pool-worker": "learn_jetstream_worker_pool_worker.py",
            "learn-jetstream-pull-consumers-fetchBatch": "learn_jetstream_pull_consumers_fetch_batch.py",
            "learn-jetstream-pull-consumers-consumeContinuous": "learn_jetstream_pull_consumers_consume_continuous.py",
            "learn-jetstream-pull-consumers-emptyFetch": "learn_jetstream_pull_consumers_empty_fetch.py",
            "learn-jetstream-ordered-consumer-read": "learn_jetstream_ordered_consumer_read.py",
            "learn-jetstream-shaping-the-stream-setLimits": "learn_jetstream_shaping_the_stream_set_limits.py",
            "learn-jetstream-shaping-the-stream-discardNew": "learn_jetstream_shaping_the_stream_discard_new.py",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "learn_jetstream_shaping_the_stream_per_subject_limit.py",
            "learn-jetstream-retention-policies-workQueueCreate": "learn_jetstream_retention_policies_work_queue_create.py",
            "learn-jetstream-retention-policies-workqueueOverlap": "learn_jetstream_retention_policies_workqueue_overlap.py",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "learn_jetstream_retention_policies_retention_switch_rejected.py",
        },
    }, {
        repo: "nats-io/nats.py",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "learn_core_nats_publish_subscribe_publish.py",
            "learn-core-nats-publish-subscribe-subscribe": "learn_core_nats_publish_subscribe_subscribe.py",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "learn_core_nats_subjects_and_wildcards_wildcard_single.py",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "learn_core_nats_subjects_and_wildcards_wildcard_multi.py",
            "learn-core-nats-request-reply-respond": "learn_core_nats_request_reply_respond.py",
            "learn-core-nats-request-reply-request": "learn_core_nats_request_reply_request.py",
            "learn-core-nats-request-reply-replies": "learn_core_nats_request_reply_replies.py",
            "learn-core-nats-queue-groups-queue-subscribe": "learn_core_nats_queue_groups_queue_subscribe.py",
            "learn-core-nats-scatter-gather-provider": "learn_core_nats_scatter_gather_provider.py",
            "learn-core-nats-scatter-gather-gather": "learn_core_nats_scatter_gather_gather.py",
        },
    }],
    "java": [{
        repo: "nats-io/nats.java",
        branch: "main",
        directory: "examples/src/main/java/io/nats/examples/natsIoDoc/",
        examples: {
            "basics-publish": "BasicsPublish.java",
            "basics-subscribe": "BasicsSubscribe.java",
            "getting-started-publish": "GettingStartedPublish.java",
            "getting-started-subscribe": "GettingStartedSubscribe.java",
            "subjects-single-wildcard": "SubjectsSingleWildcard.java",
            "subjects-multi-wildcard": "SubjectsMultiWildcard.java",
            "subjects-monitoring": "SubjectsMonitoring.java",
            "queue-groups-basic": "QueueGroupsBasic.java",
            "queue-groups-dynamic-scaling": "QueueGroupsDynamicScaling.java",
            "queue-groups-request-reply": "QueueGroupsRequestReply.java",
            "queue-groups-mixed-subscribers": "QueueGroupsMixedSubscribers.java",
            "request-reply-basic": "RequestReplyBasic.java",
            "request-reply-timeout": "RequestReplyTimeout.java",
            "request-reply-multiple-responders": "RequestReplyMultipleResponders.java",
            "request-reply-no-responders": "RequestReplyNoResponders.java",
            "request-reply-headers": "RequestReplyHeaders.java",
            "request-reply-calculator": "RequestReplyCalculator.java",
            "jetstream-basic": "JetStreamBasic.java"
        },
    }, {
        repo: "nats-io/nats.java",
        branch: "main",
        directory: "examples/src/main/java/io/nats/examples/natsIoDoc/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "LearnCoreNatsPublishSubscribePublish.java",
            "learn-core-nats-publish-subscribe-subscribe": "LearnCoreNatsPublishSubscribeSubscribe.java",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "LearnCoreNatsSubjectsAndWildcardsWildcardSingle.java",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "LearnCoreNatsSubjectsAndWildcardsWildcardMulti.java",
            "learn-core-nats-request-reply-respond": "LearnCoreNatsRequestReplyRespond.java",
            "learn-core-nats-request-reply-request": "LearnCoreNatsRequestReplyRequest.java",
            "learn-core-nats-request-reply-replies": "LearnCoreNatsRequestReplyReplies.java",
            "learn-core-nats-queue-groups-queue-subscribe": "LearnCoreNatsQueueGroupsQueueSubscribe.java",
            "learn-core-nats-scatter-gather-provider": "LearnCoreNatsScatterGatherProvider.java",
            "learn-core-nats-scatter-gather-gather": "LearnCoreNatsScatterGatherGather.java",
        },
    }, {
        repo: "nats-io/nats.java",
        branch: "main",
        directory: "examples/src/main/java/io/nats/examples/natsIoDoc/",
        examples: {
            "learn-jetstream-your-first-stream-create": "LearnJetStreamYourFirstStreamCreate.java",
            "learn-jetstream-your-first-stream-info": "LearnJetStreamYourFirstStreamInfo.java",
            "learn-jetstream-mirrors-and-sources-createMirror": "LearnJetStreamMirrorsAndSourcesCreateMirror.java",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "LearnJetStreamMirrorsAndSourcesMirrorLag.java",
            "learn-jetstream-mirrors-and-sources-createSource": "LearnJetStreamMirrorsAndSourcesCreateSource.java",
            "learn-jetstream-get-direct-by-sequence": "LearnJetStreamGetDirectBySequence.java",
            "learn-jetstream-get-direct-last-for-subject": "LearnJetStreamGetDirectLastForSubject.java",
            "learn-jetstream-get-direct-enable": "LearnJetStreamGetDirectEnable.java",
            "learn-jetstream-get-direct-direct-read": "LearnJetStreamGetDirectDirectRead.java",
            "learn-jetstream-subject-mapping-transform": "LearnJetStreamSubjectMappingTransform.java",
            "learn-jetstream-subject-mapping-republish": "LearnJetStreamSubjectMappingRepublish.java",
            "learn-jetstream-message-ttl-publishWithTtl": "LearnJetStreamMessageTtlPublishWithTtl.java",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "LearnJetStreamMessageTtlTtlOnDisabledStream.java",
            "learn-jetstream-publishing-sync": "LearnJetStreamPublishingSync.java",
            "learn-jetstream-advanced-publishing-async": "LearnJetStreamAdvancedPublishingAsync.java",
            "learn-jetstream-publishing-dedup": "LearnJetStreamPublishingDedup.java",
            "learn-jetstream-publishing-confirmStored": "LearnJetStreamPublishingConfirmStored.java",
            "learn-jetstream-reading-back-create": "LearnJetStreamReadingBackCreate.java",
            "learn-jetstream-reading-back-read": "LearnJetStreamReadingBackRead.java",
            "learn-jetstream-your-first-consumer-create": "LearnJetStreamYourFirstConsumerCreate.java",
            "learn-jetstream-your-first-consumer-pullAndAck": "LearnJetStreamYourFirstConsumerPullAndAck.java",
            "learn-jetstream-your-first-consumer-next": "LearnJetStreamYourFirstConsumerNext.java",
            "learn-jetstream-your-first-consumer-doubleAck": "LearnJetStreamYourFirstConsumerDoubleAck.java",
            "learn-jetstream-acknowledgment-nakWithDelay": "LearnJetStreamAcknowledgmentNakWithDelay.java",
            "learn-jetstream-acknowledgment-termPoison": "LearnJetStreamAcknowledgmentTermPoison.java",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "LearnJetStreamAcknowledgmentWatchMaxDeliveries.java",
            "learn-jetstream-filtering-createFiltered": "LearnJetStreamFilteringCreateFiltered.java",
            "learn-jetstream-filtering-filterMatchesNothing": "LearnJetStreamFilteringFilterMatchesNothing.java",
            "learn-jetstream-worker-pool-worker": "LearnJetStreamWorkerPoolWorker.java",
            "learn-jetstream-pull-consumers-fetchBatch": "LearnJetStreamPullConsumersFetchBatch.java",
            "learn-jetstream-pull-consumers-consumeContinuous": "LearnJetStreamPullConsumersConsumeContinuous.java",
            "learn-jetstream-pull-consumers-emptyFetch": "LearnJetStreamPullConsumersEmptyFetch.java",
            "learn-jetstream-ordered-consumer-read": "LearnJetStreamOrderedConsumerRead.java",
            "learn-jetstream-shaping-the-stream-setLimits": "LearnJetStreamShapingTheStreamSetLimits.java",
            "learn-jetstream-shaping-the-stream-discardNew": "LearnJetStreamShapingTheStreamDiscardNew.java",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "LearnJetStreamShapingTheStreamPerSubjectLimit.java",
            "learn-jetstream-retention-policies-workQueueCreate": "LearnJetStreamRetentionPoliciesWorkQueueCreate.java",
            "learn-jetstream-retention-policies-workqueueOverlap": "LearnJetStreamRetentionPoliciesWorkqueueOverlap.java",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "LearnJetStreamRetentionPoliciesRetentionSwitchRejected.java",
        },
    }, {
        repo: "synadia-io/orbit.java",
        branch: "main",
        directory: "batch-publish/src/examples/java/io/synadia/examples/",
        examples: {
            "learn-jetstream-advanced-publishing-atomic": "AtomicBatchDocExample.java",
        },
    }, {
        repo: "synadia-io/orbit.java",
        branch: "main",
        directory: "direct-batch/src/examples/java/io/synadia/examples/",
        examples: {
            "learn-jetstream-get-direct-batch-get": "LearnJetStreamGetDirectBatchGet.java",
        },
    }],
    "csharp": [{
        repo: "nats-io/nats.net",
        branch: "main",
        directory: "examples/Example.NatsIODocs/",
        examples: {
            "basics-publish": "BasicsPublish.cs",
            "basics-subscribe": "BasicsSubscribe.cs",
            "getting-started-publish": "GettingStartedPublish.cs",
            "getting-started-subscribe": "GettingStartedSubscribe.cs",
            "subjects-single-wildcard": "SubjectsSingleWildcard.cs",
            "subjects-multi-wildcard": "SubjectsMultiWildcard.cs",
            "subjects-monitoring": "SubjectsMonitoring.cs",
            "queue-groups-basic": "QueueGroupsBasic.cs",
            "queue-groups-dynamic-scaling": "QueueGroupsDynamicScaling.cs",
            "queue-groups-request-reply": "QueueGroupsRequestReply.cs",
            "queue-groups-mixed-subscribers": "QueueGroupsMixedSubscribers.cs",
            "request-reply-basic": "RequestReplyBasic.cs",
            "request-reply-timeout": "RequestReplyTimeout.cs",
            "request-reply-multiple-responders": "RequestReplyMultipleResponders.cs",
            "request-reply-no-responders": "RequestReplyNoResponders.cs",
            "request-reply-headers": "RequestReplyHeaders.cs",
            "request-reply-calculator": "RequestReplyCalculator.cs",
            "jetstream-basic": "JetStreamBasic.cs"
        },
    }, {
        repo: "nats-io/nats.net",
        branch: "main",
        directory: "examples/Example.NatsIODocs/",
        examples: {
            "learn-core-nats-publish-subscribe-publish": "LearnCoreNatsPublishSubscribePublish.cs",
            "learn-core-nats-publish-subscribe-subscribe": "LearnCoreNatsPublishSubscribeSubscribe.cs",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "LearnCoreNatsSubjectsAndWildcardsWildcardSingle.cs",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "LearnCoreNatsSubjectsAndWildcardsWildcardMulti.cs",
            "learn-core-nats-request-reply-respond": "LearnCoreNatsRequestReplyRespond.cs",
            "learn-core-nats-request-reply-request": "LearnCoreNatsRequestReplyRequest.cs",
            "learn-core-nats-request-reply-replies": "LearnCoreNatsRequestReplyReplies.cs",
            "learn-core-nats-queue-groups-queue-subscribe": "LearnCoreNatsQueueGroupsQueueSubscribe.cs",
            "learn-core-nats-scatter-gather-provider": "LearnCoreNatsScatterGatherProvider.cs",
            "learn-core-nats-scatter-gather-gather": "LearnCoreNatsScatterGatherGather.cs",
        },
    }, {
        repo: "nats-io/nats.net",
        branch: "main",
        directory: "examples/Example.NatsIODocs/",
        examples: {
            "learn-jetstream-your-first-stream-create": "LearnJetStreamYourFirstStreamCreate.cs",
            "learn-jetstream-your-first-stream-info": "LearnJetStreamYourFirstStreamInfo.cs",
            "learn-jetstream-mirrors-and-sources-createMirror": "LearnJetStreamMirrorsAndSourcesCreateMirror.cs",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "LearnJetStreamMirrorsAndSourcesMirrorLag.cs",
            "learn-jetstream-mirrors-and-sources-createSource": "LearnJetStreamMirrorsAndSourcesCreateSource.cs",
            "learn-jetstream-get-direct-by-sequence": "LearnJetStreamGetDirectBySequence.cs",
            "learn-jetstream-get-direct-last-for-subject": "LearnJetStreamGetDirectLastForSubject.cs",
            "learn-jetstream-get-direct-enable": "LearnJetStreamGetDirectEnable.cs",
            "learn-jetstream-get-direct-direct-read": "LearnJetStreamGetDirectDirectRead.cs",
            "learn-jetstream-subject-mapping-transform": "LearnJetStreamSubjectMappingTransform.cs",
            "learn-jetstream-subject-mapping-republish": "LearnJetStreamSubjectMappingRepublish.cs",
            "learn-jetstream-message-ttl-publishWithTtl": "LearnJetStreamMessageTtlPublishWithTtl.cs",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "LearnJetStreamMessageTtlTtlOnDisabledStream.cs",
            "learn-jetstream-publishing-sync": "LearnJetStreamPublishingSync.cs",
            "learn-jetstream-advanced-publishing-async": "LearnJetStreamAdvancedPublishingAsync.cs",
            "learn-jetstream-publishing-dedup": "LearnJetStreamPublishingDedup.cs",
            "learn-jetstream-publishing-confirmStored": "LearnJetStreamPublishingConfirmStored.cs",
            "learn-jetstream-reading-back-create": "LearnJetStreamReadingBackCreate.cs",
            "learn-jetstream-reading-back-read": "LearnJetStreamReadingBackRead.cs",
            "learn-jetstream-your-first-consumer-create": "LearnJetStreamYourFirstConsumerCreate.cs",
            "learn-jetstream-your-first-consumer-pullAndAck": "LearnJetStreamYourFirstConsumerPullAndAck.cs",
            "learn-jetstream-your-first-consumer-next": "LearnJetStreamYourFirstConsumerNext.cs",
            "learn-jetstream-your-first-consumer-doubleAck": "LearnJetStreamYourFirstConsumerDoubleAck.cs",
            "learn-jetstream-acknowledgment-nakWithDelay": "LearnJetStreamAcknowledgmentNakWithDelay.cs",
            "learn-jetstream-acknowledgment-termPoison": "LearnJetStreamAcknowledgmentTermPoison.cs",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "LearnJetStreamAcknowledgmentWatchMaxDeliveries.cs",
            "learn-jetstream-filtering-createFiltered": "LearnJetStreamFilteringCreateFiltered.cs",
            "learn-jetstream-filtering-filterMatchesNothing": "LearnJetStreamFilteringFilterMatchesNothing.cs",
            "learn-jetstream-worker-pool-worker": "LearnJetStreamWorkerPoolWorker.cs",
            "learn-jetstream-pull-consumers-fetchBatch": "LearnJetStreamPullConsumersFetchBatch.cs",
            "learn-jetstream-pull-consumers-consumeContinuous": "LearnJetStreamPullConsumersConsumeContinuous.cs",
            "learn-jetstream-pull-consumers-emptyFetch": "LearnJetStreamPullConsumersEmptyFetch.cs",
            "learn-jetstream-ordered-consumer-read": "LearnJetStreamOrderedConsumerRead.cs",
            "learn-jetstream-shaping-the-stream-setLimits": "LearnJetStreamShapingTheStreamSetLimits.cs",
            "learn-jetstream-shaping-the-stream-discardNew": "LearnJetStreamShapingTheStreamDiscardNew.cs",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "LearnJetStreamShapingTheStreamPerSubjectLimit.cs",
            "learn-jetstream-retention-policies-workQueueCreate": "LearnJetStreamRetentionPoliciesWorkQueueCreate.cs",
            "learn-jetstream-retention-policies-workqueueOverlap": "LearnJetStreamRetentionPoliciesWorkqueueOverlap.cs",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "LearnJetStreamRetentionPoliciesRetentionSwitchRejected.cs",
        },
    }, {
        repo: "synadia-io/orbit.net",
        branch: "main",
        directory: "tools/DocsExamples/",
        examples: {
            "learn-jetstream-advanced-publishing-atomic": "ExampleAtomicBatchDoc.cs",
            "learn-jetstream-get-direct-batch-get": "ExampleLearnJetStreamGetDirectBatchGet.cs",
        },
    }],
    "c": [{
        repo: "nats-io/nats.c",
        branch: "main",
        directory: "examples/docs/",
        examples: {
            "basics-publish": "basics_publish.c",
            "basics-subscribe": "basics_subscribe.c",
            "getting-started-publish": "getting_started_publish.c",
            "getting-started-subscribe": "getting_started_subscribe.c",
            "jetstream-basic": "jetstream_basic.c",
            "learn-backup-recovery-disaster-recovery-checkLag": "learn_backup_recovery_disaster_recovery_checkLag.c",
            "learn-backup-recovery-stream-backup-restore-verify-counts": "learn_backup_recovery_stream_backup_restore_verify_counts.c",
            "learn-clustering-placement-placeTags": "learn_clustering_placement_placeTags.c",
            "learn-clustering-placement-verifyTags": "learn_clustering_placement_verifyTags.c",
            "learn-clustering-replication-and-r3-createR3": "learn_clustering_replication_and_r3_createR3.c",
            "learn-clustering-replication-and-r3-inspectReplicas": "learn_clustering_replication_and_r3_inspectReplicas.c",
            "learn-clustering-scaling-and-peers-peerRemove": "learn_clustering_scaling_and_peers_peerRemove.c",
            "learn-core-nats-connecting-connect-and-name": "learn_core_nats_connecting_connect_and_name.c",
            "learn-core-nats-connecting-see-the-handshake": "learn_core_nats_connecting_see_the_handshake.c",
            "learn-core-nats-connection-lifecycle-lame-duck-signal": "learn_core_nats_connection_lifecycle_lame_duck_signal.c",
            "learn-core-nats-connection-lifecycle-observe-reconnect": "learn_core_nats_connection_lifecycle_observe_reconnect.c",
            "learn-core-nats-headers-publish": "learn_core_nats_headers_publish.c",
            "learn-core-nats-headers-request": "learn_core_nats_headers_request.c",
            "learn-core-nats-headers-subscribe": "learn_core_nats_headers_subscribe.c",
            "learn-core-nats-publish-subscribe-check-max-payload": "learn_core_nats_publish_subscribe_check_max_payload.c",
            "learn-core-nats-publish-subscribe-publish": "learn_core_nats_publish_subscribe_publish.c",
            "learn-core-nats-publish-subscribe-subscribe": "learn_core_nats_publish_subscribe_subscribe.c",
            "learn-core-nats-publish-subscribe-unsubscribe-after-n": "learn_core_nats_publish_subscribe_unsubscribe_after_n.c",
            "learn-core-nats-queue-groups-queue-subscribe": "learn_core_nats_queue_groups_queue_subscribe.c",
            "learn-core-nats-queue-groups-typo-splits-group": "learn_core_nats_queue_groups_typo_splits_group.c",
            "learn-core-nats-request-reply-replies": "learn_core_nats_request_reply_replies.c",
            "learn-core-nats-request-reply-request": "learn_core_nats_request_reply_request.c",
            "learn-core-nats-request-reply-respond": "learn_core_nats_request_reply_respond.c",
            "learn-core-nats-scatter-gather-first-reply-trap": "learn_core_nats_scatter_gather_first_reply_trap.c",
            "learn-core-nats-scatter-gather-gather": "learn_core_nats_scatter_gather_gather.c",
            "learn-core-nats-scatter-gather-provider": "learn_core_nats_scatter_gather_provider.c",
            "learn-core-nats-subjects-and-wildcards-invalid-subject-whitespace": "learn_core_nats_subjects_and_wildcards_invalid_subject_whitespace.c",
            "learn-core-nats-subjects-and-wildcards-wildcard-multi": "learn_core_nats_subjects_and_wildcards_wildcard_multi.c",
            "learn-core-nats-subjects-and-wildcards-wildcard-single": "learn_core_nats_subjects_and_wildcards_wildcard_single.c",
            "learn-deployment-hardening-credsConnect": "learn_deployment_hardening_credsConnect.c",
            "learn-deployment-kubernetes-streamLs": "learn_deployment_kubernetes_streamLs.c",
            "learn-deployment-rolling-upgrades-requestDuringUpgrade": "learn_deployment_rolling_upgrades_requestDuringUpgrade.c",
            "learn-deployment-rolling-upgrades-streamReplicas": "learn_deployment_rolling_upgrades_streamReplicas.c",
            "learn-deployment-sizing-and-resources-accountInfo": "learn_deployment_sizing_and_resources_accountInfo.c",
            "learn-deployment-sizing-and-resources-serverInfo": "learn_deployment_sizing_and_resources_serverInfo.c",
            "learn-jetstream-acknowledgment-nakWithDelay": "learn_jetstream_acknowledgment_nakWithDelay.c",
            "learn-jetstream-acknowledgment-termPoison": "learn_jetstream_acknowledgment_termPoison.c",
            "learn-jetstream-acknowledgment-watchMaxDeliveries": "learn_jetstream_acknowledgment_watchMaxDeliveries.c",
            "learn-jetstream-advanced-publishing-async": "learn_jetstream_advanced_publishing_async.c",
            "learn-jetstream-advanced-publishing-atomic": "learn_jetstream_advanced_publishing_atomic.c",
            "learn-jetstream-altering-stream-state-deleteMessage": "learn_jetstream_altering_stream_state_deleteMessage.c",
            "learn-jetstream-altering-stream-state-purge": "learn_jetstream_altering_stream_state_purge.c",
            "learn-jetstream-altering-stream-state-purgeFiltered": "learn_jetstream_altering_stream_state_purgeFiltered.c",
            "learn-jetstream-filtering-createFiltered": "learn_jetstream_filtering_createFiltered.c",
            "learn-jetstream-filtering-filterMatchesNothing": "learn_jetstream_filtering_filterMatchesNothing.c",
            "learn-jetstream-get-direct-by-sequence": "learn_jetstream_get_direct_by_sequence.c",
            "learn-jetstream-get-direct-direct-read": "learn_jetstream_get_direct_direct_read.c",
            "learn-jetstream-get-direct-enable": "learn_jetstream_get_direct_enable.c",
            "learn-jetstream-get-direct-last-for-subject": "learn_jetstream_get_direct_last_for_subject.c",
            "learn-jetstream-message-ttl-publishWithTtl": "learn_jetstream_message_ttl_publishWithTtl.c",
            "learn-jetstream-message-ttl-ttl-on-disabled-stream": "learn_jetstream_message_ttl_ttl_on_disabled_stream.c",
            "learn-jetstream-mirrors-and-sources-createMirror": "learn_jetstream_mirrors_and_sources_createMirror.c",
            "learn-jetstream-mirrors-and-sources-createSource": "learn_jetstream_mirrors_and_sources_createSource.c",
            "learn-jetstream-mirrors-and-sources-mirrorLag": "learn_jetstream_mirrors_and_sources_mirrorLag.c",
            "learn-jetstream-ordered-consumer-read": "learn_jetstream_ordered_consumer_read.c",
            "learn-jetstream-pausing-pastDeadline": "learn_jetstream_pausing_pastDeadline.c",
            "learn-jetstream-pausing-pauseResume": "learn_jetstream_pausing_pauseResume.c",
            "learn-jetstream-priority-groups-oneGroup": "learn_jetstream_priority_groups_oneGroup.c",
            "learn-jetstream-priority-groups-overflowPull": "learn_jetstream_priority_groups_overflowPull.c",
            "learn-jetstream-priority-groups-pinnedClient": "learn_jetstream_priority_groups_pinnedClient.c",
            "learn-jetstream-priority-groups-prioritizedPull": "learn_jetstream_priority_groups_prioritizedPull.c",
            "learn-jetstream-publishing-confirmStored": "learn_jetstream_publishing_confirmStored.c",
            "learn-jetstream-publishing-dedup": "learn_jetstream_publishing_dedup.c",
            "learn-jetstream-publishing-sync": "learn_jetstream_publishing_sync.c",
            "learn-jetstream-pull-consumers-consumeContinuous": "learn_jetstream_pull_consumers_consumeContinuous.c",
            "learn-jetstream-pull-consumers-emptyFetch": "learn_jetstream_pull_consumers_emptyFetch.c",
            "learn-jetstream-pull-consumers-fetchBatch": "learn_jetstream_pull_consumers_fetchBatch.c",
            "learn-jetstream-reading-back-create": "learn_jetstream_reading_back_create.c",
            "learn-jetstream-reading-back-read": "learn_jetstream_reading_back_read.c",
            "learn-jetstream-retention-policies-retentionSwitchRejected": "learn_jetstream_retention_policies_retentionSwitchRejected.c",
            "learn-jetstream-retention-policies-workQueueCreate": "learn_jetstream_retention_policies_workQueueCreate.c",
            "learn-jetstream-retention-policies-workqueueOverlap": "learn_jetstream_retention_policies_workqueueOverlap.c",
            "learn-jetstream-shaping-the-stream-discardNew": "learn_jetstream_shaping_the_stream_discardNew.c",
            "learn-jetstream-shaping-the-stream-perSubjectLimit": "learn_jetstream_shaping_the_stream_perSubjectLimit.c",
            "learn-jetstream-shaping-the-stream-setLimits": "learn_jetstream_shaping_the_stream_setLimits.c",
            "learn-jetstream-subject-mapping-republish": "learn_jetstream_subject_mapping_republish.c",
            "learn-jetstream-subject-mapping-transform": "learn_jetstream_subject_mapping_transform.c",
            "learn-jetstream-surviving-node-loss-check-replicas": "learn_jetstream_surviving_node_loss_check_replicas.c",
            "learn-jetstream-surviving-node-loss-set-replicas": "learn_jetstream_surviving_node_loss_set_replicas.c",
            "learn-jetstream-worker-pool-worker": "learn_jetstream_worker_pool_worker.c",
            "learn-jetstream-your-first-consumer-create": "learn_jetstream_your_first_consumer_create.c",
            "learn-jetstream-your-first-consumer-doubleAck": "learn_jetstream_your_first_consumer_doubleAck.c",
            "learn-jetstream-your-first-consumer-next": "learn_jetstream_your_first_consumer_next.c",
            "learn-jetstream-your-first-consumer-pullAndAck": "learn_jetstream_your_first_consumer_pullAndAck.c",
            "learn-jetstream-your-first-stream-create": "learn_jetstream_your_first_stream_create.c",
            "learn-jetstream-your-first-stream-info": "learn_jetstream_your_first_stream_info.c",
            "learn-key-value-history-and-revisions-casConflictRetry": "learn_key_value_history_and_revisions_casConflictRetry.c",
            "learn-key-value-history-and-revisions-casUpdate": "learn_key_value_history_and_revisions_casUpdate.c",
            "learn-key-value-history-and-revisions-keyHistory": "learn_key_value_history_and_revisions_keyHistory.c",
            "learn-key-value-ttl-and-limits-bucketWithLimits": "learn_key_value_ttl_and_limits_bucketWithLimits.c",
            "learn-key-value-ttl-and-limits-perKeyTTL": "learn_key_value_ttl_and_limits_perKeyTTL.c",
            "learn-key-value-under-the-hood-deleteVsPurge": "learn_key_value_under_the_hood_deleteVsPurge.c",
            "learn-key-value-under-the-hood-streamInfoOfBucket": "learn_key_value_under_the_hood_streamInfoOfBucket.c",
            "learn-key-value-watching-eoiHandling": "learn_key_value_watching_eoiHandling.c",
            "learn-key-value-watching-watchBucket": "learn_key_value_watching_watchBucket.c",
            "learn-key-value-watching-watchFiltered": "learn_key_value_watching_watchFiltered.c",
            "learn-key-value-your-first-bucket-bucketStatus": "learn_key_value_your_first_bucket_bucketStatus.c",
            "learn-key-value-your-first-bucket-createBucket": "learn_key_value_your_first_bucket_createBucket.c",
            "learn-key-value-your-first-bucket-getValue": "learn_key_value_your_first_bucket_getValue.c",
            "learn-key-value-your-first-bucket-nameRejected": "learn_key_value_your_first_bucket_nameRejected.c",
            "learn-key-value-your-first-bucket-putValue": "learn_key_value_your_first_bucket_putValue.c",
            "learn-monitoring-advisories-and-events-persistAdvisories": "learn_monitoring_advisories_and_events_persistAdvisories.c",
            "learn-monitoring-advisories-and-events-subscribeAdvisories": "learn_monitoring_advisories_and_events_subscribeAdvisories.c",
            "learn-monitoring-jetstream-health-consumerState": "learn_monitoring_jetstream_health_consumerState.c",
            "learn-monitoring-jetstream-health-streamState": "learn_monitoring_jetstream_health_streamState.c",
            "learn-monitoring-prometheus-and-dashboards-checkConsumer": "learn_monitoring_prometheus_and_dashboards_checkConsumer.c",
            "learn-resilient-clients-connecting-basic": "learn_resilient_clients_connecting_basic.c",
            "learn-resilient-clients-connecting-discovered": "learn_resilient_clients_connecting_discovered.c",
            "learn-resilient-clients-connecting-handle-connect-error": "learn_resilient_clients_connecting_handle_connect_error.c",
            "learn-resilient-clients-connecting-pool": "learn_resilient_clients_connecting_pool.c",
            "learn-resilient-clients-connection-events-handle-closed": "learn_resilient_clients_connection_events_handle_closed.c",
            "learn-resilient-clients-connection-events-health-check": "learn_resilient_clients_connection_events_health_check.c",
            "learn-resilient-clients-connection-events-watch-events": "learn_resilient_clients_connection_events_watch_events.c",
            "learn-resilient-clients-drain-and-shutdown-drain-on-signal": "learn_resilient_clients_drain_and_shutdown_drain_on_signal.c",
            "learn-resilient-clients-drain-and-shutdown-drain-subscription": "learn_resilient_clients_drain_and_shutdown_drain_subscription.c",
            "learn-resilient-clients-drain-and-shutdown-drain-timeout": "learn_resilient_clients_drain_and_shutdown_drain_timeout.c",
            "learn-resilient-clients-drain-and-shutdown-flush": "learn_resilient_clients_drain_and_shutdown_flush.c",
            "learn-resilient-clients-drain-and-shutdown-publish-after-drain": "learn_resilient_clients_drain_and_shutdown_publish_after_drain.c",
            "learn-resilient-clients-reconnection-handle-reconnect-errors": "learn_resilient_clients_reconnection_handle_reconnect_errors.c",
            "learn-resilient-clients-reconnection-reconnect-options": "learn_resilient_clients_reconnection_reconnect_options.c",
            "learn-resilient-clients-request-reply-resilience-no-responders": "learn_resilient_clients_request_reply_resilience_no_responders.c",
            "learn-resilient-clients-request-reply-resilience-request-basic": "learn_resilient_clients_request_reply_resilience_request_basic.c",
            "learn-resilient-clients-request-reply-resilience-retry-idempotent": "learn_resilient_clients_request_reply_resilience_retry_idempotent.c",
            "learn-resilient-clients-slow-consumers-handle-slow-consumer": "learn_resilient_clients_slow_consumers_handle_slow_consumer.c",
            "learn-resilient-clients-slow-consumers-pending-limits": "learn_resilient_clients_slow_consumers_pending_limits.c",
            "learn-resilient-clients-tls-and-auth-connect-creds": "learn_resilient_clients_tls_and_auth_connect_creds.c",
            "learn-resilient-clients-tls-and-auth-connect-tls": "learn_resilient_clients_tls_and_auth_connect_tls.c",
            "learn-resilient-clients-tls-and-auth-handle-auth-error": "learn_resilient_clients_tls_and_auth_handle_auth_error.c",
            "learn-services-discovery-discoverInfo": "learn_services_discovery_discoverInfo.c",
            "learn-services-discovery-targetInstance": "learn_services_discovery_targetInstance.c",
            "learn-services-endpoints-and-groups-addGroup": "learn_services_endpoints_and_groups_addGroup.c",
            "learn-services-endpoints-and-groups-customQueueGroup": "learn_services_endpoints_and_groups_customQueueGroup.c",
            "learn-services-endpoints-and-groups-immutableEndpoints": "learn_services_endpoints_and_groups_immutableEndpoints.c",
            "learn-services-endpoints-and-groups-secondService": "learn_services_endpoints_and_groups_secondService.c",
            "learn-services-observability-serviceError": "learn_services_observability_serviceError.c",
            "learn-services-observability-serviceStats": "learn_services_observability_serviceStats.c",
            "learn-services-scaling-runInstances": "learn_services_scaling_runInstances.c",
            "learn-services-scaling-stopService": "learn_services_scaling_stopService.c",
            "learn-services-your-first-service-addService": "learn_services_your_first_service_addService.c",
            "learn-services-your-first-service-requestService": "learn_services_your_first_service_requestService.c",
            "learn-services-your-first-service-validateInput": "learn_services_your_first_service_validateInput.c",
            "queue-groups-basic": "queue_groups_basic.c",
            "queue-groups-dynamic-scaling": "queue_groups_dynamic_scaling.c",
            "queue-groups-mixed-subscribers": "queue_groups_mixed_subscribers.c",
            "queue-groups-request-reply": "queue_groups_request_reply.c",
            "request-reply-basic": "request_reply_basic.c",
            "request-reply-calculator": "request_reply_calculator.c",
            "request-reply-headers": "request_reply_headers.c",
            "request-reply-multiple-responders": "request_reply_multiple_responders.c",
            "request-reply-no-responders": "request_reply_no_responders.c",
            "request-reply-timeout": "request_reply_timeout.c",
            "subjects-monitoring": "subjects_monitoring.c",
            "subjects-multi-wildcard": "subjects_multi_wildcard.c",
            "subjects-single-wildcard": "subjects_single_wildcard.c",
            "tutorials-build-an-app-call-app": "tutorials_build_an_app_call_app.c",
            "tutorials-build-an-app-create-stream": "tutorials_build_an_app_create_stream.c",
            "tutorials-build-an-app-view-stream": "tutorials_build_an_app_view_stream.c",
            "tutorials-first-stream-create": "tutorials_first_stream_create.c",
            "tutorials-first-stream-publish": "tutorials_first_stream_publish.c",
            "tutorials-first-stream-replay": "tutorials_first_stream_replay.c",
            "tutorials-hello-nats-publish": "tutorials_hello_nats_publish.c",
            "tutorials-hello-nats-subscribe": "tutorials_hello_nats_subscribe.c",
            "tutorials-key-value-create-bucket": "tutorials_key_value_create_bucket.c",
            "tutorials-key-value-put-get": "tutorials_key_value_put_get.c",
            "tutorials-key-value-update": "tutorials_key_value_update.c",
            "tutorials-key-value-watch": "tutorials_key_value_watch.c",
            "tutorials-request-reply-request": "tutorials_request_reply_request.c",
            "tutorials-request-reply-responder": "tutorials_request_reply_responder.c",
            "tutorials-stream-consumer-add-consumer": "tutorials_stream_consumer_add_consumer.c",
            "tutorials-stream-consumer-pull-and-ack": "tutorials_stream_consumer_pull_and_ack.c",
            "tutorials-work-queue-publish": "tutorials_work_queue_publish.c",
            "tutorials-work-queue-worker": "tutorials_work_queue_worker.c"
        },
    }],
};

// Output directory for fetched examples
const OUTPUT_DIR = path.join(__dirname, "..", "static", "examples", "snippets");

/**
 * Fetch a file from GitHub
 */
function fetchFromGitHub(repo, branch, filePath, redirectsLeft = 3) {
    return new Promise((resolve, reject) => {
        const url =
            `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
        console.log(`Fetching: ${url}`);

        const req = https.get(url, (response) => {
            const status = response.statusCode;

            if (status >= 300 && status < 400 && response.headers.location) {
                response.resume();
                if (redirectsLeft <= 0) {
                    reject(new Error(`Too many redirects for ${url}`));
                    return;
                }
                const loc = new URL(response.headers.location, url);
                https.get(loc.toString(), (r2) => handle(r2, loc.toString()))
                    .on("error", reject)
                    .setTimeout(30000, function () { this.destroy(new Error(`Timeout fetching ${loc}`)); });
                return;
            }

            handle(response, url);

            function handle(resp, fromUrl) {
                if (resp.statusCode !== 200) {
                    resp.resume();
                    reject(new Error(`Failed to fetch ${fromUrl}: ${resp.statusCode}`));
                    return;
                }
                let data = "";
                resp.setEncoding("utf8");
                resp.on("data", (chunk) => { data += chunk; });
                resp.on("end", () => resolve(data));
                resp.on("error", reject);
            }
        });

        req.on("error", reject);
        req.setTimeout(30000, () => {
            req.destroy(new Error(`Timeout fetching ${url}`));
        });
    });
}

/**
 * Extract relevant code snippet from full example file
 * Looks for NATS-DOC-START and NATS-DOC-END markers to extract specific sections
 * Falls back to full code if no markers are present
 */
function extractSnippet(code, language, type) {
    // Pattern works for both // and # style comments
    const startPattern = /^[\s]*[#\/]+\s*NATS-DOC-START/;
    const endPattern = /^[\s]*[#\/]+\s*NATS-DOC-END/;

    const lines = code.split("\n");
    const result = [];
    let inSection = false;

    for (const line of lines) {
        if (startPattern.test(line)) {
            inSection = true;
            continue; // Skip the marker line itself
        }
        if (endPattern.test(line)) {
            inSection = false;
            continue; // Skip the marker line itself
        }
        if (inSection) {
            result.push(line);
        }
    }

    // Clean up indentation from extracted lines
    if (result.length > 0) {
        // Find minimum indentation (excluding empty lines)
        const minIndent = result
            .filter((line) => line.trim().length > 0)
            .reduce((min, line) => {
                const match = line.match(/^[\t ]*/);
                return Math.min(min, match ? match[0].length : 0);
            }, Infinity);

        // Remove minimum indentation from all lines
        const cleanedResult = result.map((line) => {
            if (line.trim().length === 0) return line; // Keep empty lines as-is
            // Remove minIndent characters from start
            return line.substring(minIndent);
        });

        const extracted = cleanedResult.join("\n").trim();
        console.log(`  ✓ Extracted marked section (${result.length} lines)`);
        return extracted;
    } else if (lines.some((l) => startPattern.test(l))) {
        console.log(`  ⚠ Found markers but no content between them`);
        return code;
    } else {
        console.log(`  ℹ No markers found, using full code`);
        return code;
    }
}

/**
 * Parse example type into page and snippet
 * e.g., "basics-publish" -> { page: "basics", snippet: "publish" }
 */
function parseExampleType(exampleType) {
    const parts = exampleType.split("-");
    if (parts.length >= 2) {
        const snippet = parts[parts.length - 1]; // Last part is the snippet
        const page = parts.slice(0, -1).join("-"); // Everything else is the page
        return { page, snippet };
    }
    // Fallback for examples without proper naming
    return { page: "misc", snippet: exampleType };
}

/**
 * Fetch all examples for all languages
 */
async function fetchAllExamples() {
    // Create output directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const results = {};
    const metadata = {
        timestamp: new Date().toISOString(),
        examples: {},
    };

    for (const [language, configOrArrayOfConfigs] of Object.entries(EXAMPLES_CONFIG)) {
        console.log(`\nFetching examples for ${language}...`);
        results[language] = {};
        metadata.examples[language] = {};

        const configs = Array.isArray(configOrArrayOfConfigs) ? configOrArrayOfConfigs : [configOrArrayOfConfigs];
        for (const config of configs) {
            await fetchExample(results, metadata, language, config)
        }
    }

    // Process local CLI examples
    const cliMetadata = await processCLIExamples();
    if (cliMetadata.cli) {
        metadata.examples.cli = cliMetadata.cli;
    }

    // Save metadata about fetched examples
    const metadataPath = path.join(OUTPUT_DIR, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log("\nExamples fetched successfully!");
    console.log(`Saved to: ${OUTPUT_DIR}`);
    return results;
}

async function fetchExample(results, metadata, language, config) {
    // Skip if no examples defined yet
    if (Object.keys(config.examples).length === 0) {
        console.log(`  ⏭ Skipping ${language} - no examples defined yet`);
        return;
    }

    let directory = "";
    if (config.directory != null) {
        directory = config.directory;
        console.log(`⌘ Examples Directory: ${directory}`);
    }

    // Create language directory
    const langDir = path.join(OUTPUT_DIR, language);
    await fs.mkdir(langDir, { recursive: true });

    for (
        const [exampleType, examplePath] of Object.entries(config.examples)
        ) {
        try {
            const code = await fetchFromGitHub(
                config.repo,
                config.branch,
                directory + examplePath,
            );
            const originalLines = code.split("\n").length;
            const snippet = extractSnippet(code, language, exampleType);
            const extractedLines = snippet.split("\n").length;

            // Parse page and snippet from example type
            const { page, snippet: snippetName } = parseExampleType(
                exampleType,
            );

            // Create page directory
            const pageDir = path.join(langDir, page);
            await fs.mkdir(pageDir, { recursive: true });

            // Save the snippet in page/snippet.ext structure
            const outputPath = path.join(
                pageDir,
                `${snippetName}.${getFileExtension(language)}`,
            );
            await fs.writeFile(outputPath, snippet);

            // Store metadata
            metadata.examples[language][exampleType] = {
                path: outputPath.replace(OUTPUT_DIR + "/", ""),
                page: page,
                snippet: snippetName,
                originalLines: originalLines,
                extractedLines: extractedLines,
                markersFound: originalLines !== extractedLines,
            };

            results[language][exampleType] = outputPath;
            console.log(
                `  ✓ ${exampleType} -> ${page}/${snippetName}.${getFileExtension(language)
                }`,
            );
        } catch (error) {
            console.error(`  ✗ ${exampleType}: ${error.message}`);
            results[language][exampleType] = null;
            metadata.examples[language][exampleType] = {
                error: error.message,
            };
        }
    }
}
/**
 * Get file extension for a language
 */
function getFileExtension(language) {
    const extensions = {
        "javascript": "js",
        "go": "go",
        "python": "py",
        "java": "java",
        "rust": "rs",
        "csharp": "cs",
        "cli": "sh",
        "c": "c",
    };
    return extensions[language] || "txt";
}

/**
 * Process local CLI examples from static/examples/snippets/cli
 */
async function processCLIExamples() {
    const cliDir = path.join(
        __dirname,
        "..",
        "static",
        "examples",
        "snippets",
        "cli",
    );
    const metadata = {};

    console.log("\nProcessing local CLI examples...");

    try {
        // Check if CLI directory exists
        await fs.access(cliDir);

        // Recursively find all .sh files in the CLI directory
        async function findCLIFiles(dir, relativePath = "") {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const files = {};

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = relativePath
                    ? path.join(relativePath, entry.name)
                    : entry.name;

                if (entry.isDirectory()) {
                    // Recursively process subdirectories
                    const subFiles = await findCLIFiles(fullPath, relPath);
                    Object.assign(files, subFiles);
                } else if (entry.isFile() && entry.name.endsWith(".sh")) {
                    // Process .sh files
                    const content = await fs.readFile(fullPath, "utf8");
                    const lines = content.split("\n").length;

                    // Parse directory structure to create example type
                    // e.g., basics/publish.sh -> basics-publish
                    const pathParts = relPath.split(path.sep);
                    const fileName = pathParts.pop().replace(".sh", "");
                    const exampleType = pathParts.length > 0
                        ? `${pathParts.join("-")}-${fileName}`
                        : fileName;

                    // Store metadata
                    files[exampleType] = {
                        path: `cli/${relPath}`,
                        page: pathParts.length > 0
                            ? pathParts.join("-")
                            : "misc",
                        snippet: fileName,
                        originalLines: lines,
                        extractedLines: lines,
                        markersFound: false,
                        source: "local",
                    };

                    console.log(`  ✓ ${exampleType} -> ${relPath}`);
                }
            }

            return files;
        }

        metadata["cli"] = await findCLIFiles(cliDir);

        if (Object.keys(metadata["cli"]).length === 0) {
            console.log("  ⚠ No CLI examples found");
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log("  ⚠ CLI examples directory not found");
            metadata["cli"] = {};
        } else {
            console.error(
                `  ✗ Error processing CLI examples: ${error.message}`,
            );
            metadata["cli"] = { error: error.message };
        }
    }

    return metadata;
}

// Run the script
if (require.main === module) {
    fetchAllExamples().catch(console.error);
}

module.exports = {
    fetchAllExamples,
    EXAMPLES_CONFIG,
    extractSnippet,
    parseExampleType,
    processCLIExamples,
};
