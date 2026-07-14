#!/bin/bash
# Key and bucket names are validated. A bucket name may use only letters,
# digits, dash, and underscore. A key may use letters, digits, and the
# characters - / _ = . — and nothing else.
#
# An order id like "ord:8w2k" has a colon, which is not allowed as a key.
# The client library validates the name and rejects the put before it is
# sent, so nothing is written to the bucket:

nats kv put INVENTORY "ord:8w2k" 42 || echo "rejected: ':' is not a legal key character"

# A legal key with the same intent uses an allowed separator, e.g.
#
#   nats kv put INVENTORY ord_8w2k 42
#
# We don't run that against INVENTORY here: it's the running example for the
# whole chapter and should still hold only widget-blue at this point.
