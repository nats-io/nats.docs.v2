#!/bin/bash
# Getting a name that was never put — or one that has been deleted —
# fails with a not-found error rather than returning empty bytes. Always
# check the result of a get before using what it returns.
#
#   nats: error: nats: object not found
#
# In a client library this surfaces as ErrObjectNotFound. Treat it as a
# normal branch: the warehouse asked for an invoice that has not been
# produced yet, so wait and retry rather than shipping without it.
nats object get INVOICES invoice-ord_NOPE.pdf

# Confirm the object exists before you depend on its bytes. `nats object
# info` returns the metadata if the name is present and the same
# not-found error if it is not.
nats object info INVOICES invoice-ord_8w2k.pdf
