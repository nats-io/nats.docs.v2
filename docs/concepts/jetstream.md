---
title: JetStream
description: Persistence, replay, and at-least-once delivery
sidebar_position: 5
---

# JetStream

JetStream is the persistence layer built into the NATS server. It durably stores messages, replays them on demand, and provides at-least-once delivery — using the same subjects, auth, and topology as Core NATS.

**When you'd use it:** subscribers may be offline, you need history replay or audit, you want at-least-once with acknowledgements, or you want a built-in key-value or object store.

```bash
nats stream add ORDERS --subjects "orders.>" --storage file
nats pub orders.created '{"orderId":"A-1001"}'
```

A consumer then reads from the stream at its own pace with explicit acks:

<div class="nats-example" data-type="jetstream-basic-consumer" data-languages="cli,go,rust"></div>

[Deep dive: JetStream →](/jetstream/overview)
