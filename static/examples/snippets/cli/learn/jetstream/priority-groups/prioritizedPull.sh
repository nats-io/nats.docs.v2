#!/bin/bash

# Prioritized policy: each pull carries a 0-9 priority and the server serves
# the lowest number first, so nearer workers get first refusal and farther
# ones pick up the instant the nearer ones go quiet.

# Create a prioritized pull consumer on ORDERS. --prioritized-groups sets the
# policy to prioritized and names the single group "regions". Prioritized
# sorts pulls by number and tracks no per-client counts, so unlike overflow
# and pinned_client it needs no explicit acks.
nats consumer add ORDERS dispatch \
  --prioritized-groups regions \
  --pull \
  --defaults

# Inspect it — the configuration shows Priority Policy: Prioritized and
# Priority Groups: regions.
nats consumer info ORDERS dispatch

# The priority rides on the pull request. natscli's `nats consumer next` sends
# a group-less pull that the server rejects with "Bad Request - Priority Group
# missing", so the prioritized pull itself — with group and priority set on the
# request — comes from a client library.
