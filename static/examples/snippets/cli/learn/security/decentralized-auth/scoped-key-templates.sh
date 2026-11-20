#!/bin/sh
# Give each regional order service its own subjects from one scoped key.
# The key's permission uses a template; the server fills it in from the
# user's "region" tag when the user connects.

# Add a scoped signing key whose publish permission uses the region tag.
nats auth account keys add ORDERS regional-writer \
  --pub-allow 'orders.{{tag(region)}}.>' --sub-allow '_INBOX.>'
# Expected output (your key will differ):
# Scoped Signing Key AAATXHSENBUEY47FBMCABBSEQE6X3GQ2UWTPCPB2NLIQANV4RHW7EDB3
#                Role: regional-writer

# Issue a user from that key with the tag region:eu.
nats auth user add order-svc-eu ORDERS --key regional-writer \
  --tags region:eu --defaults --credential order-svc-eu.creds
# User order-svc-eu (UDQSWTVD75VJKKE74QE6PPT7DJBFJLFRNZIMDEZPP4RYOZN73SHRDCVY)
#              Scoped: true
#                Tags: region:eu
#   Publish Allow: orders.{{tag(region)}}.>

# The new key lives in the ORDERS account JWT: push it.
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
# Success 1 Failed 0 Expected 1

# The user may publish to its own region only.
nats pub orders.eu.created '{"order_id":"ord_3m9q"}' --creds order-svc-eu.creds
# Published 23 bytes to "orders.eu.created"
nats pub orders.us.created '{"order_id":"ord_3m9q"}' --creds order-svc-eu.creds
# nats: error: nats: permissions violation: Permissions Violation for Publish to "orders.us.created"
