---
title: Consumers
description: Push and pull delivery from JetStream streams
sidebar_position: 3
---

# Consumers

A **consumer** is a stateful view over a stream. It tracks which messages an application has acknowledged, applies optional filters, and delivers messages either as a push to a subject or by pull on demand.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Push vs pull

When to use each. Pull is the recommended default for new applications.

## Durable vs ephemeral

Lifetime, naming, and recovery semantics.

## Acknowledgement modes

`AckExplicit`, `AckNone`, `AckAll`, plus redelivery and `AckWait`.

## Filters and delivery policies

Subject filters, `DeliverAll` / `DeliverNew` / `DeliverByStartSequence` / `DeliverByStartTime`.

## Flow control and back-pressure

Max in-flight, sample frequency, idle heartbeats.

## TODO

- Diagram of consumer position and acks
- Code samples for pull consumer fetch loop
- Common pitfalls (slow consumer, acks not sent, redelivery storms)
