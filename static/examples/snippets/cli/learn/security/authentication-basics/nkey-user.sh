#!/bin/sh
# Generate a user nkey and authenticate with it. The server config
# holds only the public key; the private seed stays with the client.

# Generate the keypair. The private seed goes to user.nk and nothing
# is printed; `show` prints the matching public key for the config.
nats auth nkey gen user --output user.nk
nats auth nkey show user.nk
# UAPZQH4MNJCOVEJFERB3NFSIROQ5RE7CGBEPKAZSB6QB7IQHBKXHZPVP

# Put that public key in the server's user list:
# authorization { users: [ { nkey: UAPZQH4MNJCOVEJFERB3NFSIROQ5RE7CGBEPKAZSB6QB7IQHBKXHZPVP } ] }

# Connect with the seed file. The client signs the server's nonce with
# the seed, so the secret never crosses the wire. A seed the server
# doesn't know fails with: nats: error: nats: Authorization Violation
nats pub orders.created \
  --nkey user.nk \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Expected output:
# 18:02:29 Published 91 bytes to "orders.created"
