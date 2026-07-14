#!/bin/bash
# Publishing after drain is a race, not a clean rejection. Drain runs in
# two phases: while the client is draining its subscriptions it still
# accepts a publish (so a handler can reply), and only once it moves on to
# flushing publishes does a new publish come back with a draining error
# (ErrConnectionDraining in nats.go, the equivalent in each library). A
# publish issued right after Drain() may slip through or may be rejected.
#
# The nats CLI has no scriptable "publish after drain" path: once it
# unsubscribes on Ctrl-C it exits, so there is no later publish to reject.
# This snippet shows the closest CLI stand-in — a publish issued against a
# server that is no longer accepting it fails fast and prints the error
# rather than succeeding silently. The client tabs (JS/Go/etc.) show the
# real shape: handle the draining error from a publish issued after Drain()
# instead of assuming the call succeeded.
#
# The teaching point the client tabs carry: drain last, after the
# application has stopped producing. Do not interleave a final "shutting
# down" publish with the shutdown — handle the draining error if you do.

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server nats://n1:4222 \
  --connection-name order-svc
