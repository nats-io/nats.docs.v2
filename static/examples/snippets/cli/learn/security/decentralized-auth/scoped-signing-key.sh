#!/bin/sh
# Re-issue order-svc from a scoped signing key instead of the ORDERS
# account's identity key. The scoped key carries a fixed permission set,
# so every user it issues gets exactly those permissions.

# Add a scoped signing key with the role name "order-writer" to ORDERS.
nats auth account keys add ORDERS order-writer \
  --pub-allow 'orders.>' --sub-allow '_INBOX.>'
# Expected output (your key will differ):
# Scoped Signing Key ACQFRPTMQBCYT7QB2PRHW3XEMBZYXLOXT5V7IBYTZP3CBPV6VCW2ME5E
#                Role: order-writer

# Remove the unrestricted order-svc from the previous page. --revoke
# records its key in the ORDERS account JWT, so the old creds stop
# working once the account is pushed again.
nats auth user rm order-svc ORDERS --revoke -f
# Removed user order-svc

# Re-issue order-svc signed by the scoped key. --key takes the role
# name; -f overwrites the creds file from the previous page.
nats auth user add order-svc ORDERS --key order-writer \
  --defaults --credential order-svc.creds -f
# User order-svc (UASBX5L3X7MSAAAPVRKNAQFRMAFKP4VOKB6O3ZZ72QYD2DQCL2W4TP5K)
#    Issuer: ACQFRPTM... (the scoped key)
#    Scoped: true

# Re-mint the creds file with a 720-hour expiry. Expiry lives on the
# minted credential; the stored user is untouched.
nats auth user credential order-svc.creds order-svc ORDERS --expire 720h -f
# Wrote credential for order-svc to order-svc.creds

# Confirm the issuer and the permissions applied from the scope.
nats auth user info order-svc ORDERS
