# NatsFlow Demo

This page demonstrates the interactive NatsFlow diagrams.

## Publish-Subscribe Pattern

The publish-subscribe pattern allows one publisher to send messages to multiple subscribers.

<div class="nats-flow" data-scenario="publishSubscribe"></div>

When a publisher sends a message on a subject, all subscribers listening to that subject receive a copy of the message.

## Request-Reply Pattern

The request-reply pattern enables synchronous communication between a client and a service.

<div class="nats-flow" data-scenario="requestReply"></div>

The client sends a request and waits for a reply from the service. NATS handles the reply routing automatically.

## Queue Groups

Queue groups provide load balancing across multiple subscribers.

<div class="nats-flow" data-scenario="queueGroup" data-width="600" data-height="350"></div>

Each message is delivered to only one subscriber in the queue group, distributing the workload.

## Fan-Out Pattern

Fan-out broadcasts events to multiple independent services.

<div class="nats-flow" data-scenario="fanOut" data-width="600" data-height="450"></div>

A single event triggers multiple services to react independently.
