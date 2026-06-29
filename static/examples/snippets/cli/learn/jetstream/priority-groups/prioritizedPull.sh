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

# Inspect it — the configuration shows Priority Policy: prioritized and
# Priority Groups: [regions].
nats consumer info ORDERS dispatch

# The priority rides on the pull request, which natscli's `nats consumer next`
# does not expose a flag for. A worker pulls plainly (priority 0) and is
# served ahead of any higher-numbered pull:
nats consumer next ORDERS dispatch --count 5
