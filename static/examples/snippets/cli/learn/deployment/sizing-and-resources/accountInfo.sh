#!/bin/bash
# Read the LIVE account limits for the ORDERS account before you size anything.
# This is the source of truth: it shows the tier and the ceilings the server
# will actually enforce, not what you hope the config says.
#
# Connect as order-svc in the ORDERS account, then ask the server.
nats account info \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/order-svc.creds

# Look for these rows in the output:
#   Memory:    the MaxMemory ceiling for the account
#   Storage:   the MaxStore ceiling (file storage) for the account
#   Streams:   MaxStreams — how many streams the account may create
#   Consumers: MaxConsumers — how many consumers per stream
#
# Sizing rule: on an UN-tiered account an R3 stream counts as
# replicas x bytes against MaxStore, so a 10 GiB ORDERS stream at R3
# spends 30 GiB of the account's storage limit. A tiered account bakes
# replication into the tier, so the number you see is the usable bytes.
