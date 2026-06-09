#!/bin/bash
# Stand up the `east` cluster: three servers in a full mesh of routes,
# running locally on client ports 4222/4223/4224 and cluster (route) ports
# 6222/6223/6224. Same cluster name on all three; only the non-seed servers
# carry a route to the seed, and gossip completes the mesh.

# --- n1-east: the seed. Others point at its cluster port (6222) first. ---
cat > n1-east.conf <<'EOF'
server_name: n1-east
listen: 127.0.0.1:4222

cluster {
  name: east
  listen: 127.0.0.1:6222
}
EOF

# --- n2-east: client 4223, route 6223, dials the seed on 6222. ---
cat > n2-east.conf <<'EOF'
server_name: n2-east
listen: 127.0.0.1:4223

cluster {
  name: east
  listen: 127.0.0.1:6223
  routes: [
    nats://127.0.0.1:6222
  ]
}
EOF

# --- n3-east: client 4224, route 6224, also dials the seed on 6222. ---
cat > n3-east.conf <<'EOF'
server_name: n3-east
listen: 127.0.0.1:4224

cluster {
  name: east
  listen: 127.0.0.1:6224
  routes: [
    nats://127.0.0.1:6222
  ]
}
EOF

# Start all three. The seed comes up first; the others dial it, gossip runs,
# and within a moment every server holds a route to every other server.
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &

# Give the mesh a moment to form before inspecting it.
sleep 1
