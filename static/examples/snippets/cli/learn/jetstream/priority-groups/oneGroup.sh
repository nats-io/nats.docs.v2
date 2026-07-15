#!/bin/bash

# A consumer acts on exactly one priority group. The --overflow-groups
# and --pinned-groups flags accept a comma list, so it is easy to pass
# two by accident.

# NOT THIS: two group names. The server accepts the create without error,
# but it uses only the first group (regions) and silently ignores the
# rest. Multiple groups per consumer is reserved for a future release.
nats consumer add ORDERS dispatch \
  --overflow-groups regions,backup \
  --pull \
  --ack explicit \
  --defaults

# DO THIS: name a single group. To split work by region or tier, run
# separate consumers, each with its own group, on the same stream.
nats consumer add ORDERS dispatch \
  --overflow-groups regions \
  --pull \
  --ack explicit \
  --defaults
