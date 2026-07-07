#!/bin/bash

# Verify server tags BEFORE placing a stream, then place against exactly
# what the servers advertise — so a typo fails loudly instead of silently
# placing nowhere.
#
# This assumes the 3-server "east" cluster from forming-a-cluster is
# running (its configs define the SYS user the server commands need).

# Read the tags each server actually advertises. Name the server: asked
# without a name, `nats server info` answers with whichever server
# responds first, not necessarily the one you connected to. The Tags
# line is the source of truth — do not assume the config took.
nats server info n1-east --user sys --password sys
nats server info n2-east --user sys --password sys
nats server info n3-east --user sys --password sys
# Each reply carries the tags in its Cluster section:
#
#   Cluster:
#
#                                Name: east
#                                Tags: region:us-east, disk:ssd
#                                Host: 127.0.0.1:6222

# Now place ORDERS against exactly the tags you just read back.
nats stream edit ORDERS \
  --cluster east \
  --tag region:us-east \
  --tag disk:ssd \
  -f

# If a requested tag is misspelled, or carried by fewer servers than the
# replica count needs, the placement fails and the error names the tags
# it could not satisfy — it does NOT fall back to any server:
#
#   nats: error: could not edit Stream ORDERS: no suitable peers for placement, tags not matched ['disk:sdd'] (10005)
#
# Fix the spelling to match what the servers advertise (case does not
# matter) and re-run. Confirm the placement landed where you intended:
nats stream info ORDERS
