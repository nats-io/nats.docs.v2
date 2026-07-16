#!/bin/sh
# Connect with a user JWT alone, no seed. The JWT is the first block of
# a creds file; v0.4.0 has no command that prints it by itself, so cut
# it out with sed.
JWT="$(sed -n '/BEGIN NATS USER JWT/,/END NATS USER JWT/{/---/d;p;}' order-svc.creds)"

# A normal user's JWT alone is rejected: with no seed, the client
# can't sign the server's nonce.
nats pub orders.created 'x' --jwt "$JWT"
# nats: error: nats: Authorization Violation

# Create a bearer user for a browser dashboard and push it.
nats auth user add orders-dashboard ORDERS --bearer --defaults \
  --credential orders-dashboard.creds
#        Bearer Token: true
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds

# Marking the user isn't enough: ORDERS still has Bearer Tokens
# Allowed: false, so its JWT alone gets the same rejection.
JWT="$(sed -n '/BEGIN NATS USER JWT/,/END NATS USER JWT/{/---/d;p;}' orders-dashboard.creds)"
nats pub orders.created 'x' --jwt "$JWT"
# nats: error: nats: Authorization Violation

# Allow bearer tokens on the account and push again.
nats auth account edit ORDERS --bearer
#   Bearer Tokens Allowed: true
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds

# Now the JWT connects on its own: no seed, no nonce signature.
nats pub orders.created '{"order_id":"ord_2f7q","customer":"acme-co","total_cents":990}' --jwt "$JWT"
# 18:05:09 Published 62 bytes to "orders.created"
