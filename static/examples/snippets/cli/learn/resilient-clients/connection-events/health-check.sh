#!/bin/bash
# Probe the pool the way a monitoring system would.
#
# `nats server check connection` opens a fresh connection and measures
# three things against warn/critical thresholds: how long the connect
# took, the server round-trip time, and a full publish/subscribe round
# trip. The exit code follows the Nagios convention — 0 OK, 1 warning,
# 2 critical, 3 unknown — so the command slots into monitoring systems
# and container health probes directly.
#
# The thresholds below are the defaults, written out to show the knobs.

nats server check connection \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connect-warn 500ms --connect-critical 1s \
  --rtt-warn 500ms --rtt-critical 1s

# For scripting, `--format=json` renders the same result as JSON with a
# "status" field; `--format=prometheus` emits metrics and always exits 0.

# A quick latency read without thresholds: `nats rtt` computes the
# round-trip time to your servers, five round trips each by default.
nats rtt
