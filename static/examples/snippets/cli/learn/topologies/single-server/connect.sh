#!/bin/bash
# Connect to the single server n1 and publish one order.
# The client names exactly one server URL; that is the whole topology.
# This same publish runs unchanged against the cluster, super-cluster,
# and leaf node in later pages — only the connect URL grows.
nats pub --server nats://localhost:4222 orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
