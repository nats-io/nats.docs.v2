---
id: index
title: "Messaging patterns"
description: "Patterns built on core NATS: request-reply, queue groups, fan-out, scatter-gather, and subject design"
---
# Messaging patterns

These patterns need no JetStream. They're the shapes of traffic you get from subjects, interest, and queue groups.

## Pages

| Pattern | Use it to |
| --- | --- |
| [Request-reply services](/architecture/patterns/messaging/request-reply-services) | Expose a service as a subject, scale it with a queue group, and find it without a discovery system |
| [Load balancing with queue groups](/architecture/patterns/messaging/queue-groups) | Spread a subject's traffic across workers with no broker-side configuration |
| [Fan-out](/architecture/patterns/messaging/fan-out) | Deliver one message to many subscribers with interest-based routing and wildcards |
| [Scatter-gather](/architecture/patterns/messaging/scatter-gather) | Ask many responders one question and collect the answers within a deadline |
| [Subject hierarchies](/architecture/patterns/messaging/subject-hierarchies) | Design a subject tree that routes, filters, and authorizes at once |

