#!/bin/bash
# Key and bucket names are validated. A bucket name may use only letters,
# digits, dash, and underscore. A key may use letters, digits, and the
# characters - / _ = . — and nothing else.
#
# An order id like "ord:8w2k" has a colon, which is not allowed as a key.
# The server rejects the put rather than storing a broken key:

nats kv put INVENTORY "ord:8w2k" 42 || echo "rejected: ':' is not a legal key character"

# A legal key with the same intent uses an allowed separator:
nats kv put INVENTORY ord_8w2k 42
