#!/bin/bash
# Sign users with a scoped signing key, not the ORDERS account's own seed.
# A scoped signing key carries fixed permissions, so a leaked signing key
# can only stamp out the users you already scoped -- never an admin user.

# Add a signing key to the ORDERS account. ORDERS keeps its identity seed
# offline; this generated key is what signs day-to-day users.
nsc edit account --name ORDERS --sk generate

# Promote that signing key to a scoped key and pin its permissions.
# Replace <sk> with the public signing key printed by the command above.
nsc edit signing-key --account ORDERS --sk <sk> --role order-writer \
  --allow-pub "orders.>"

# Sign order-svc with the scoped key (the role), not the ORDERS seed.
# Add an expiry so the user JWT does not live forever.
nsc add user --name order-svc --account ORDERS \
  --private-key order-writer --expiry 720h

# Confirm what signed it: the issuer is the signing key, and the JWT
# carries an expiration rather than living forever.
nsc describe user --account ORDERS --name order-svc
