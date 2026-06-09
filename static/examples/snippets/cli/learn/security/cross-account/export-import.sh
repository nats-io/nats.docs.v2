#!/bin/bash
# Cross-account sharing in config-based (centralized) mode: ORDERS exports the
# stream orders.shipped, ANALYTICS imports it. Then order-svc publishes and
# analytics-reader subscribes across the account boundary.

# 1. Write the server config. ORDERS offers orders.shipped as a public stream
#    export; ANALYTICS asks for it with a matching import.
cat > cross-account.conf <<'EOF'
accounts {
  ORDERS {
    users: [
      { user: order-svc, password: "s3cr3t" }
    ]
    exports: [
      { stream: "orders.shipped" }
    ]
  }
  ANALYTICS {
    users: [
      { user: analytics-reader, password: "an4lytics" }
    ]
    imports: [
      { stream: { account: ORDERS, subject: "orders.shipped" } }
    ]
  }
}
EOF

# 2. Start the server with this config.
nats-server -c cross-account.conf &
SERVER_PID=$!
sleep 1

# 3. Subscribe as analytics-reader (ANALYTICS) to the imported subject.
nats --server nats://localhost:4222 \
  --user analytics-reader --password an4lytics \
  sub "orders.shipped" &
SUB_PID=$!
sleep 1

# 4. Publish a shipment as order-svc (ORDERS).
nats --server nats://localhost:4222 \
  --user order-svc --password s3cr3t \
  pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

sleep 1

# analytics-reader receives the message: the ORDERS export and the ANALYTICS
# import line up on orders.shipped, so it crosses the account boundary.

kill "$SUB_PID"
kill "$SERVER_PID"
