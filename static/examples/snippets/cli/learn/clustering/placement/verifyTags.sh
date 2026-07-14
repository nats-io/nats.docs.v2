#!/bin/bash

# Verify server tags BEFORE placing a stream, then place against exactly
# what the servers advertise — so a typo fails loudly instead of silently
# placing nowhere.
#
# This assumes the 3-node "east" cluster is running with JetStream
# enabled. Tag matching folds case (ssd == SSD) but is matched as an exact
# intersection: every requested tag must be present, spelled correctly, on a
# server for it to qualify.

# Read the tags each server actually advertises. Do not assume the config
# took — a typo in server_tags is silent until a placement asks for a tag
# no server carries. The Tags line in the output is the source of truth.
#
# `nats server info` queries the system account ($SYS), so connect with a
# system user. Name the server you want, or the command answers for whichever
# server replies to the $SYS ping first.
nats server info n1-east
nats server info n2-east
nats server info n3-east

# Now place ORDERS against exactly the tags you just read back.
nats --server nats://127.0.0.1:4222 stream add ORDERS \
  --subjects "orders.>" \
  --replicas 3 \
  --tag region:us-east \
  --tag disk:ssd \
  --defaults

# If a requested tag is misspelled or missing on every server, the
# intersection is empty and the create fails — it does NOT fall back to
# any server. The error names the tag no server carried, in brackets:
#
#   nats: error: could not create Stream: no suitable peers for placement, tags not matched ['disk:sdd'] (10005)
#
# Fix the spelling to match what the servers advertise (case does not
# matter) and re-run. Confirm the placement landed where you intended:
nats --server nats://127.0.0.1:4222 stream info ORDERS
