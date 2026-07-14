#!/bin/bash

# Pinned_client policy: one active client gets all the work, with a
# standby ready to take over.

# Create a pinned consumer. --pinned-groups sets the policy to
# pinned_client and names the group "ordered". --pinned-ttl is how long
# the server waits for a pull from the pinned client before pinning a
# standby instead. Pinned consumers require explicit acks.
nats consumer add ORDERS sequencer \
  --pinned-groups ordered \
  --pinned-ttl 90s \
  --pull \
  --ack explicit \
  --defaults

# Inspect it — the configuration shows Priority Policy: Pinned Client,
# Priority Groups: ordered, and Pinned TTL: 1m30s. The State block shows
# which client (if any) currently holds the pin.
nats consumer info ORDERS sequencer

# The Nats-Pin-Id handshake rides on the pull request, which natscli's
# `nats consumer next` does not drive: a group-less pull is rejected with
# "Bad Request - Priority Group missing". The client-side pinning loop comes
# from a client library.

# Force the server to pick a new pinned client. -f skips the confirmation
# prompt; it takes the stream, the consumer, and the group name.
nats consumer unpin ORDERS sequencer ordered -f
