#!/bin/bash
# Confirm the `east` cluster formed a full mesh: three servers, each holding
# a route to the other two.

# Point the CLI at any server in the cluster; the report covers them all.
export NATS_URL="nats://127.0.0.1:4222"

# Cluster-wide overview. Look for three rows, all with Cluster = east, and a
# Routes (Rts) count of 2 on each server: every server is routed to the
# other two, which is the full mesh.
nats server report

# A single server's own view: its client port, its routes, and the cluster
# name it belongs to. Use the server_name from the report above.
nats server info n1-east

# List the discovered servers in the cluster. The count argument waits for
# that many servers to answer, so it matches the three you expect.
nats server list 3
