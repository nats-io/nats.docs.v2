#!/bin/sh
# A service export is request/reply, not publish/subscribe. If ANALYTICS calls
# a service subject that ORDERS exports but no responder is running, the
# request comes back as "No responders are available" right away.
#
# This demo starts its own server on the default port, so stop the chapter's
# server first.

# 1. ORDERS exports a service "orders.price"; ANALYTICS imports it.
#    No responder is started in ORDERS, so nothing can answer yet.
cat > cross-account-service.conf <<'EOF'
accounts {
  ORDERS {
    users: [
      { user: order-svc, password: s3cr3t }
    ]
    exports: [
      { service: "orders.price" }
    ]
  }
  ANALYTICS {
    users: [
      { user: analytics-reader, password: an4lytics }
    ]
    imports: [
      { service: { account: ORDERS, subject: "orders.price" } }
    ]
  }
}
EOF

# 2. Start the server.
nats-server -c cross-account-service.conf &
SERVER_PID=$!
sleep 1

# 3. analytics-reader requests the imported service. No responder is running
#    in ORDERS, so the server answers immediately instead of letting the
#    request wait out the full timeout.
nats --server nats://localhost:4222 \
  --user analytics-reader --password an4lytics \
  request orders.price '{"order_id":"ord_8w2k"}' --timeout 2s
# Expected (the CLI exits 0):
#   14:19:42 Sending request on "orders.price"
#   14:19:42 No responders are available

# "No responders" means the import matched the service export but nothing
# answered: start a responder in ORDERS. A request with no import at all gets
# the same immediate answer, because it never leaves ANALYTICS. An import that
# doesn't match any export fails earlier, when the server starts.

kill "$SERVER_PID"
