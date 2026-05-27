#!/bin/bash

# Create a pinned_client priority-group consumer, inspect its pin state,
# then force a switch with unpin.

# --pinned-groups names the single group "ordered" and sets the policy to
# pinned_client. --pinned-ttl controls how long the server waits for a
# pull from the pinned client before selecting a new one. Pinned
# consumers require explicit acks.
nats consumer add ORDERS sequencer \
  --pinned-groups ordered \
  --pinned-ttl 90s \
  --pull \
  --ack explicit \
  --defaults

# The State block shows which client holds the pin, or "No client".
nats consumer info ORDERS sequencer

# List every fully pinned consumer in the stream.
nats consumer find ORDERS --pinned

# Clear the current pin and make the server choose again. Takes the
# stream, the consumer, and the group name.
nats consumer unpin ORDERS sequencer ordered
