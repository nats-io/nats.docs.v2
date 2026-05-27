#!/bin/bash

# Create an overflow priority-group consumer and inspect its config.

# --overflow-groups names the single group "regions" and sets the policy
# to overflow. Overflow consumers require explicit acks.
nats consumer add ORDERS dispatch \
  --overflow-groups regions \
  --pull \
  --ack explicit \
  --defaults

# The config now reports the priority fields.
nats consumer info ORDERS dispatch

# Near-region workers pull with no threshold and always get served.
# Far-region workers set a min_pending threshold on the pull request so
# they only receive overflow once the consumer backs up — a pull-side
# option carried by the client library, not by `nats consumer next`.
nats consumer next ORDERS dispatch --count 5
