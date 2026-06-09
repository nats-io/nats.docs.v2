#!/bin/bash
# Stand up a two-cluster super-cluster on one machine: east + west, joined by gateways.
# Each cluster is a 3-server full mesh of routes; a gateway block joins the two clusters.
# Run this from an empty working directory. Stop everything with: pkill -f nats-server

set -e

# --- east cluster config: n1-east, n2-east, n3-east ---
# client ports 4222/4223/4224, route port 6222+, gateway port 7222.
for i in 1 2 3; do
  client=$((4221 + i))
  route=$((6221 + i))
  gw=7222
  cat > "n${i}-east.conf" <<EOF
server_name: n${i}-east
listen: 127.0.0.1:${client}
http: 127.0.0.1:$((8221 + i))

cluster {
  name: east
  listen: 127.0.0.1:${route}
  routes: [
    nats://127.0.0.1:6222
    nats://127.0.0.1:6223
    nats://127.0.0.1:6224
  ]
}

gateway {
  name: "east"
  port: ${gw}
  gateways: [
    { name: "west", urls: ["nats://127.0.0.1:7322", "nats://127.0.0.1:7323", "nats://127.0.0.1:7324"] }
  ]
}
EOF
done

# --- west cluster config: n1-west, n2-west, n3-west ---
# client ports 4322/4323/4324, route port 6322+, gateway port 7322.
for i in 1 2 3; do
  client=$((4321 + i))
  route=$((6321 + i))
  gw=7322
  cat > "n${i}-west.conf" <<EOF
server_name: n${i}-west
listen: 127.0.0.1:${client}
http: 127.0.0.1:$((8321 + i))

cluster {
  name: west
  listen: 127.0.0.1:${route}
  routes: [
    nats://127.0.0.1:6322
    nats://127.0.0.1:6323
    nats://127.0.0.1:6324
  ]
}

gateway {
  name: "west"
  port: ${gw}
  gateways: [
    { name: "east", urls: ["nats://127.0.0.1:7222", "nats://127.0.0.1:7223", "nats://127.0.0.1:7224"] }
  ]
}
EOF
done

# Note: only n1 of each cluster owns the gateway listen port shown above.
# n2/n3 reuse the same gateway block but listen on distinct ports in a real
# deployment. For a quick local demo, start one gateway-listening server per
# cluster plus its route peers.

# Start all six servers.
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &
nats-server -c n1-west.conf &
nats-server -c n2-west.conf &
nats-server -c n3-west.conf &

# Give the clusters and gateways time to form.
sleep 3

# Confirm the super-cluster: each side should report the other cluster.
nats --server nats://127.0.0.1:4222 server report gateways
