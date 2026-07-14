#!/bin/bash

# Give a single key its own lifetime with a per-key TTL.
#
# Per-key TTL rides on the bucket's Limit Markers, so the bucket must have
# them enabled first. INVENTORY was created without them, so turn them on
# once (the duration is how long the bucket keeps the expiry marker):
nats kv edit INVENTORY --marker-ttl 1h

# Now create flash-sale with a 30-minute TTL. The value expires on its own
# 30 minutes after this create; no service has to remember to clean it up.
# Note: TTL is accepted on CREATE only.
nats kv create INVENTORY flash-sale 99 --ttl 30m

# Expected: create echoes the value it stored, and the key counts down on
# its own:
#
#   99
#
# Per-key TTL requires nats-server 2.11 or newer. On an older server the
# create is rejected because the bucket cannot enable Limit Markers.

# --- Per-key TTL is create-only: to change it, delete then create ---------
#
# Neither put nor update takes a --ttl; the CLI rejects the flag. Writing
# flash-sale again with put or update appends a new value with no TTL, so
# the key stops expiring rather than keeping its clock. To give flash-sale
# a different lifetime, remove it and create it again with the new TTL:
nats kv del INVENTORY flash-sale --force
nats kv create INVENTORY flash-sale 99 --ttl 10m

# The key now expires in 10 minutes instead of 30.
