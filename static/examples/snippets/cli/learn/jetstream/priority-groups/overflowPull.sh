#!/bin/bash

# Overflow policy: a standby region pulls only when the consumer has
# backed up past a min_pending threshold.

# Create an overflow pull consumer on ORDERS. --overflow-groups sets the
# policy to overflow and names the single group "regions". Overflow
# requires explicit acks.
nats consumer add ORDERS dispatch \
  --overflow-groups regions \
  --pull \
  --ack explicit \
  --defaults

# Inspect it — the configuration now shows Priority Policy: overflow and
# Priority Groups: [regions].
nats consumer info ORDERS dispatch

# The min_pending threshold lives on the pull request, which natscli's
# `nats consumer next` does not expose a flag for. A near-region worker
# pulls plainly and always gets messages:
nats consumer next ORDERS dispatch --count 5
