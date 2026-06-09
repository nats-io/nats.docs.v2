#!/bin/bash

# Stand up a hub server plus a factory-1 leaf locally, on one machine,
# so you can watch a leaf node bridge subject interest. The hub accepts
# leaf connections on 7422; factory-1 dials out to it as a remote.
#
# Real Acme runs the hub as the 3-server `east` cluster and factory-1 on
# the plant floor. This local version collapses the hub to one server so
# the whole thing fits on a laptop. The shape is identical.

set -e

# --- Hub config: accept inbound leaf connections on 7422 ---
cat > /tmp/hub.conf <<'EOF'
server_name: n1-east
listen: 0.0.0.0:4222

# Accept inbound leaf node connections. The default leaf port is 7422,
# kept distinct from the client port (4222), route port (6222), and
# gateway port (7222).
leafnodes {
  listen: 0.0.0.0:7422
}
EOF

# --- Leaf config: dial the hub with a remote ---
# A remote carries the hub urls (nats-leaf:// scheme), the credentials
# proving who the leaf is, and the account it binds to on the hub.
# For this local demo the hub runs without authorization, so the
# credentials line is omitted; in production it is required.
cat > /tmp/factory-1.conf <<'EOF'
server_name: factory-1
listen: 0.0.0.0:4322

leafnodes {
  remotes: [
    {
      urls: [ "nats-leaf://127.0.0.1:7422" ]
      account: "$G"
    }
  ]
}
EOF

# Start the hub first; it must be listening before the leaf dials out.
nats-server -c /tmp/hub.conf &
HUB_PID=$!
sleep 1

# Start the leaf; it opens the outbound connection to the hub on 7422.
nats-server -c /tmp/factory-1.conf &
LEAF_PID=$!
sleep 1

# Confirm the leaf is attached, from the hub's point of view. The report
# names factory-1, the account it bound to, and the leaf's address.
nats --server nats://127.0.0.1:4222 server report leafnodes

# Clean up.
kill $LEAF_PID $HUB_PID 2>/dev/null
