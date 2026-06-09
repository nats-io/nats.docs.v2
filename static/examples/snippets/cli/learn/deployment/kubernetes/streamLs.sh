#!/bin/bash

# Confirm the stream the NACK controller created from a Stream CRD is
# really the R3 ORDERS stream you declared — not a half-applied or
# single-replica copy. Run this from the nats-box pod that the NATS Helm
# chart deploys alongside the StatefulSet, so it resolves nats-0..2 over
# the headless service.
#
# Open a shell in nats-box first:
#   kubectl exec -it deploy/nats-box -- sh
# then run the commands below against the cluster.

# List every stream the cluster holds. After the Stream CRD reconciles,
# ORDERS appears here even though no human ran `nats stream add` — the
# controller created it from the declarative resource.
nats stream ls

# Read ORDERS back in full. The line that matters for a CRD-created
# stream is Replicas: 3 — proof the controller honoured `replicas: 3`
# from the CRD spec and placed a copy on each of nats-0, nats-1, nats-2.
nats stream info ORDERS

# Publish one order to prove the CRD-created stream actually accepts
# writes across all three replicas. The payload is the canonical Acme
# order shape, unchanged from every other chapter.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Expected (trimmed): the Configuration block shows
#   Replicas: 3
#   Storage:  File
# and the State block shows the message you just published, with the
# Cluster section listing nats-0 as leader and nats-1/nats-2 as
# replicas. If Replicas reads 1, the CRD spec is missing `replicas: 3`
# or the controller has not finished reconciling yet — re-run after the
# .status block on the CRD reports ready.
