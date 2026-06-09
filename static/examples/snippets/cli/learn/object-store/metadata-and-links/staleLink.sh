#!/bin/bash
# A link is a snapshot of its target at creation time, not a live
# reference that keeps the target alive. Delete the target and the link
# is left dangling: a get on the link fails with a not-found error.
#
# Delete the invoice that label-ord_8w2k.png points at:
nats object rm INVOICES invoice-ord_8w2k.pdf --force

# Now get the link. The store traverses to invoice-ord_8w2k.pdf, finds it
# deleted, and fails — the link still exists, but its target does not:
#
#   nats: error: nats: object not found
#
# In a client library this surfaces as ErrObjectNotFound. Always confirm
# the target exists before depending on a link, or prefer a bucket link
# for loose coupling so a single deleted object cannot strand it.
nats object get INVOICES label-ord_8w2k.png

# Confirm the target before you depend on the link. `nats object info`
# returns the metadata if the target is present and the same not-found
# error if it is gone:
nats object info INVOICES invoice-ord_8w2k.pdf
