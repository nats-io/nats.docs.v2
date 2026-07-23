---
title: Subjects
description: Understanding NATS subject-based messaging and wildcards
---

import { WildcardComparison } from '@site/src/components/NatsFlow';

# Subjects

NATS implements a subject-based messaging system where publishers and subscribers communicate through named channels called subjects. This provides a location-transparent, interest-based communication pattern that automatically routes messages across distributed NATS servers.

For a runnable, step-by-step treatment, see the [Subjects and wildcards in the Core NATS deep dive](/learn/core-nats/subjects-and-wildcards).

## What is a Subject?

A subject is a string of characters that forms a name which publishers and subscribers use to find each other. It acts as the address for message routing within NATS. Subjects are case-sensitive and can contain any UTF-8 characters except whitespace, tabs and line breaks. It's a good practice to use alphanumeric characters along with `-` (dash) and `_` (underscore) for readability.

<div class="nats-flow" data-scenario="publishSubscribe" data-width="600" data-height="350"></div>

In the animation above, `events.data` is the subject - it's the named channel that connects the publisher to all subscribers without any direct addressing.

## Subject Hierarchies

The `.` (dot) character creates a subject hierarchy, enabling logical grouping of related subjects. This hierarchical namespace helps organize your messaging architecture:

```
orders.retail.placed
orders.retail.shipped
orders.retail.returned
orders.wholesale.placed
orders.wholesale.shipped
orders.wholesale.returned
```

## Wildcards

NATS provides two wildcards for flexible subscription patterns. While publishers always send to a fully specified subject, subscribers can use wildcards to receive messages from multiple subjects.

<div class="nats-flow" data-scenario="subjectsWildcardAnimated" data-width="700" data-height="450"></div>

The subscriber with pattern `orders.retail.*` receives messages from matching subjects (green and blue paths) but not from non-matching subjects (red path). The `*` wildcard matches exactly one token.

### Single Token Wildcard (`*`)

The `*` wildcard matches exactly one token. For example:

- `orders.retail.*` matches:
  - `orders.retail.placed`
  - `orders.retail.shipped`
  - `orders.retail.returned`

- `orders.*.placed` matches:
  - `orders.retail.placed`
  - `orders.wholesale.placed`

<div class="nats-example" data-type="subjects-single-wildcard" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

### Multi-Token Wildcard (`>`)

The `>` wildcard matches one or more tokens and can only appear at the end of a subject.
If your domain is like this:

```
sensor.alarm.smoke                   # unqualified
sensor.alarm.smoke.critical          # qualified
sensor.alarm.water
sensor.alarm.water.critical
```

The `>` wildcard matches one or more tokens and can only appear at the end of a subject. 
For example, `sensor.>` matches all sensor subjects

<div class="nats-example" data-type="subjects-multi-wildcard" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

### Wildcard Comparison

You can combine wildcards for more complex patterns and compare how `*` and `>` wildcards behave differently:

<WildcardComparison width={800} height={500} />

The visualization demonstrates:
- **Single token wildcard** `*`: Matches exactly one token, as in `sensor.alarm.*` and `sensor.*.*.critical`
- **Multi-token wildcard** `>`: Matches one or more tokens, as in `sensor.>`

## Subject Naming Conventions

### Recommended Characters

- **Alphanumeric**: `a-z`, `A-Z`, `0-9`
- **Special**: `-` (dash) and `_` (underscore)
- **Delimiter**: `.` (dot) for hierarchy

### Reserved Characters

- `.` (dot) - Used for hierarchy, cannot be part of a token
- `*` (asterisk) - Wildcard, cannot be in subject names
- `>` (greater than) - Wildcard, cannot be in subject names
- Whitespace - Not allowed in subjects

### Reserved Prefixes

Subjects starting with `$` are reserved for system use:
- `$SYS` - System subjects
- `$JS` - JetStream API subjects
- `$KV` - Key-Value store subjects
- `$O` - Object Store subjects
- `$SRV` - Service API subjects
- `_INBOX` - Auto-generated reply subjects

## Best Practices

### Subject Hierarchy Design

1. **Start general, get specific**: Use the first tokens for broad categorization
   ```
   app.region.service.entity.action
   myapp.us-east.users.profile.update
   ```

2. **Keep it reasonable**: Limit to ~16 tokens and under 256 characters total

3. **Be consistent**: Establish naming conventions early and stick to them

4. **Plan for wildcards**: Design hierarchies that work well with wildcard subscriptions

### Performance Considerations

- **Subjects Interest graph is in-memory and dynamic**: NATS builds a routing table only for subjects with active subscribers, kept entirely in RAM for fast lookups
- **Subjects are essentially free**: Creating new subjects has virtually no overhead - NATS efficiently handles millions of unique subjects.
- **Wildcard matching is optimized**: Subscriptions with wildcards (`*` and `>`) use efficient trie-based matching.

### Security and Filtering

Well-designed subject hierarchies enable:
- Fine-grained access control per user/account
- Efficient message filtering in JetStream streams
- Clean import/export patterns between accounts
- Logical organization for monitoring and debugging

## Location Transparency

One of NATS' key features is location transparency through subject-based addressing:

- Subscriptions automatically propagate across the NATS cluster
- Messages route to all interested subscribers regardless of their location
- No configuration needed for message routing between servers
- Publishers and subscribers don't need to know about each other's location

## Wire Taps and Monitoring

The `>` wildcard enables powerful monitoring capabilities:

<div class="nats-example" data-type="subjects-monitoring" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Related Concepts

- [Publish-Subscribe Basics](./pub-sub-basics) - Core messaging patterns
- [Request-Reply](./request-reply) - Synchronous communication using subjects
- [Queue Groups](./queue-groups) - Load balancing with subject subscriptions

## Try It Yourself

Experiment with subjects using the NATS CLI:

```bash
# Terminal 1: Subscribe with wildcards
nats sub "demo.>"

# Terminal 2: Publish to various subjects
nats pub demo.test "Hello"
nats pub demo.test.nested "Nested message"
nats pub demo.another.topic "Another topic"
```

Each message published in Terminal 2 will be received by the wildcard subscription in Terminal 1, demonstrating how subject hierarchies and wildcards work together.

## Next steps

- [Subjects and wildcards in the Core NATS deep dive](/learn/core-nats/subjects-and-wildcards) — runnable, step-by-step walkthrough
- [Subject-based authorization](/learn/security/authorization) — control access by subject pattern
