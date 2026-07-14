#!/bin/bash

# A consumer tracks state for exactly one priority group. You can list more
# than one, and the server accepts it, but only the first group gets pin and
# state tracking — so treat multiple groups as unsupported.

# NOT THIS: two group names. The server accepts the create, and a pull naming
# either group is served, but only the first group (regions) gets state and
# pin tracking. Independent groups per consumer are planned for a future
# release. (natscli v0.4.x can't attach an overflow group with
# --overflow-groups, so these examples use --config.)
cat > two-groups.json <<'EOF'
{
  "durable_name": "dispatch",
  "ack_policy": "explicit",
  "priority_policy": "overflow",
  "priority_groups": ["regions", "backup"]
}
EOF
nats consumer add ORDERS dispatch --config two-groups.json

# DO THIS: name a single group. To split work by region or tier, run
# separate consumers, each with its own group, on the same stream.
cat > one-group.json <<'EOF'
{
  "durable_name": "dispatch",
  "ack_policy": "explicit",
  "priority_policy": "overflow",
  "priority_groups": ["regions"]
}
EOF
nats consumer add ORDERS dispatch --config one-group.json
