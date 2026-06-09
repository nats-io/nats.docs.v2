#!/bin/bash
# An edit only changes the LOCAL JWT in nsc's store. The server keeps the
# old account JWT until you push again, so order-svc fails to connect.
# Re-push after every account or operator change.

# Edit the ORDERS account locally (here: a connection-count limit).
nsc edit account --name ORDERS --conns 50

# Without a push, the server still holds the previous ORDERS JWT:
#   nats: Authorization Violation   (server logs: "account jwt not found")

# Deliver the updated JWT to the running server, then reconnect.
nsc push --account ORDERS

# Confirm the server's copy matches your local store.
nsc push --account ORDERS --diff
