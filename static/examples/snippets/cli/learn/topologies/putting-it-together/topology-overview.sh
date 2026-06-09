#!/bin/bash
# Survey the whole Acme deployment at once: two clusters (east + west)
# joined by gateways, with the factory-1 leaf dialed into east.
#
# These are read-only system-account commands. Point nats at any server
# in the deployment with a context or --server / --user that has system
# access.

# 1. The full server inventory: every server, its cluster, and its
#    route / gateway / leaf connection counts in one table.
nats server list

# 2. The routes layer — the full mesh inside each cluster.
#    Shows n1-east <-> n2-east <-> n3-east, and the same for west.
nats server report routes

# 3. The gateway layer — the connections between clusters that make
#    east + west a super-cluster.
nats server report gateways

# 4. The leaf layer — every leaf node dialed into the hub.
#    factory-1 shows up here with the account it bound to and Spoke=yes.
nats server report leafnodes

# 5. JetStream across the whole deployment: where the ORDERS stream
#    and the meta layer live.
nats server report jetstream

# 6. Drill into a single server to see all three roles on one process.
#    n1-east carries cluster routes, a gateway to west, and the inbound
#    factory-1 leaf connection.
nats server info n1-east
