#!/bin/bash
# Mismatched gateway names: a server in west whose gateways array points at
# "east" by the wrong name will be rejected, and the seam never forms.
# This shows how to confirm the super-cluster actually joined east <-> west.
# Assumes the east+west super-cluster from gateway-config.sh is running.

# Ask an east server what gateways it sees. A healthy super-cluster lists the
# remote cluster "west" with a live connection.
nats --server nats://127.0.0.1:4222 server report gateways

# If the names do not match, the connection is refused. The rejected server's
# log carries a line like:
#   Connection from "west" rejected, wanted to connect to "east", this is "eats"
# and `server report gateways` shows no remote cluster — east stands alone.

# The fix: the local `name` in each gateway block must equal the cluster's own
# gateway name, and each entry in the `gateways` array must use the remote
# cluster's exact gateway name. east points at name "west", west points at
# name "east" — character for character. Re-check from west too:
nats --server nats://127.0.0.1:4322 server report gateways
