#!/bin/bash
# A service export is request/reply, not publish/subscribe. If ANALYTICS calls
# a service subject that ORDERS exports but no responder is running (or the
# import was wired as a stream by mistake), the request returns "no responders"
# right away instead of crossing the boundary.
#
# This shows how that failure surfaces at the CLI so you can tell a service-vs-
# stream mismatch from a working share.

# 1. ORDERS exports a service "orders.price" to ANALYTICS, which imports it.
#    No responder is started in ORDERS, so the service has no one answering yet.
cat > cross-account-service.conf <<'EOF'
accounts {
  ORDERS {
    users: [
      { user: order-svc, password: "s3cr3t" }
    ]
    exports: [
      { service: "orders.price" }
    ]
  }
  ANALYTICS {
    users: [
      { user: analytics-reader, password: "an4lytics" }
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

# 3. analytics-reader requests the imported service. No responder is running in
#    ORDERS, so the server answers immediately with "no responders" rather than
#    waiting for the full timeout.
nats --server nats://localhost:4222 \
  --user analytics-reader --password an4lytics \
  request orders.price '{"order_id":"ord_8w2k"}' --timeout 2s
# Expected:
#   nats: error: no responders are available for request

# A "no responders" result means the import resolved to a service export but
# nothing answered. A request that hangs until the timeout instead means the
# import never matched an export at all. Either way, start a responder in ORDERS
# and confirm the export type is "service", not "stream".

kill "$SERVER_PID"
