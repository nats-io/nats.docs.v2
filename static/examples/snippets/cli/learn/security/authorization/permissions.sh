#!/bin/bash
# Authorize order-svc: restrict it to publishing under orders.> and deny all
# subscribes. This demonstrates the centralized-config form of subject
# permissions, then publishes an allowed vs a denied subject as order-svc.

# 1. Write the server config. order-svc gets a permissions block: a publish
#    allow-list (which closes off every other subject) and a subscribe deny of
#    everything (order-svc only publishes).
cat > authz.conf <<'EOF'
accounts {
  ORDERS: {
    users: [
      {
        user: order-svc
        password: "s3cr3t"
        permissions: {
          publish: {
            allow: ["orders.>"]
          }
          subscribe: {
            deny: [">"]
          }
        }
      }
    ]
  }
}
EOF

# 2. Start the server with that config.
nats-server -c authz.conf &

# 3. Connect as order-svc.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# 4. Allowed: orders.created matches the publish allow-list "orders.>".
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# 5. Denied: billing.charge is not on the allow-list. The server rejects it:
#    nats: error: Permissions Violation for Publish to "billing.charge"
nats pub billing.charge '{"order_id":"ord_8w2k","amount_cents":4200}'
