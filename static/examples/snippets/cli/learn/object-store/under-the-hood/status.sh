#!/bin/bash
# `nats object info INVOICES` (with no object name) reports the bucket's
# status: it reads the backing OBJ_INVOICES stream and translates the stream
# facts back into bucket terms — storage, replicas, total size, and the
# backing store, which is always "JetStream".
#
# This is the same information a client's Status() call returns.
nats object info INVOICES

# Now watch a soft delete in action. Soft delete does not erase a name
# quietly; it writes one more metadata message that marks the object
# Deleted=true, sets Size and Chunks to zero, and then purges the object's
# chunk messages from the stream.
nats object rm INVOICES invoice-ord_8w2k.pdf

# After the delete, getting the name fails with a not-found error: the
# latest metadata says the object is gone, and its chunks have been purged.
#
#   nats: error: nats: object not found
nats object get INVOICES invoice-ord_8w2k.pdf
