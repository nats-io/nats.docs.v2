#!/bin/bash
# Pitfall fix: advisories are transient, so capture them in a stream that
# is always listening. Create a dedicated stream that records every
# advisory the cluster publishes, so none is missed while no one watches.
nats stream add ADVISORIES \
  --subjects '$JS.EVENT.ADVISORY.>' \
  --storage file \
  --retention limits \
  --max-age 168h \
  --defaults

# Now the max_deliver advisory for a poison order is durable. Read back
# every advisory the stream has recorded, oldest first:
nats stream view ADVISORIES

# Or replay only the consumer max-delivery events:
nats stream view ADVISORIES --subject \
  '$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.>'
