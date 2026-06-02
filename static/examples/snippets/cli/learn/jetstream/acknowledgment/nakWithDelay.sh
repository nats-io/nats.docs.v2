#!/bin/bash
# Processing failed. Tell the server to redeliver this message, but back
# off first so the retry does not fire into the same transient error.
#
# The CLI naks with `nats consumer next --nak`. A plain nak asks for
# redelivery right away. To space out successive redeliveries, configure
# a growing delay on the consumer with --backoff; the server then waits
# longer before each new attempt.

# Give the shipping consumer a growing redelivery delay: 1s, then more,
# up to 30s, across 5 steps.
nats consumer edit ORDERS shipping \
  --ack=explicit \
  --backoff=linear \
  --backoff-steps=5 \
  --backoff-min=1s \
  --backoff-max=30s

# Pull the next message and negatively acknowledge it.
# The server applies the backoff delay before redelivering.
nats consumer next ORDERS shipping --nak
