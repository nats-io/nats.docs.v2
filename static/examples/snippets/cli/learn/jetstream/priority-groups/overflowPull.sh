#!/bin/bash

# Overflow policy: a standby region pulls only when the consumer has
# backed up past a min_pending threshold.

# Create an overflow pull consumer on ORDERS. natscli v0.4.x has a bug
# where --overflow-groups sets the policy without attaching the group, so
# create it from a config file instead. Overflow requires explicit acks.
cat > overflow-consumer.json <<'EOF'
{
  "durable_name": "dispatch",
  "ack_policy": "explicit",
  "priority_policy": "overflow",
  "priority_groups": ["regions"]
}
EOF
nats consumer add ORDERS dispatch --config overflow-consumer.json

# Inspect it — the configuration now shows Priority Policy: Overflow and
# Priority Groups: regions.
nats consumer info ORDERS dispatch

# The min_pending threshold rides on the pull request. natscli's
# `nats consumer next` sends a group-less pull that the server rejects with
# "Bad Request - Priority Group missing", so the overflow pull itself — with
# group and min_pending set on the request — comes from a client library.
