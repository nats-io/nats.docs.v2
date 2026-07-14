#!/bin/bash
# Put a large invoice into the INVOICES bucket and watch it get split into
# chunks. The object is `invoice-ord_9x3m.pdf`, a 3 MB PDF for one Acme
# order. You do nothing special to enable chunking: put always splits the
# bytes at the chunk size (128 KB by default) and stores each slice as one
# message.
#
# `order-svc` would run this after a large multi-page invoice is generated.
nats object put INVOICES invoice-ord_9x3m.pdf

# Read the object's metadata. The `Chunks` field is the count of chunk
# messages the bytes were split into; `Size` is the reassembled byte size;
# `Digest` is the SHA-256 the client computed while storing.
#
# At the 128 KB default a 3 MB file lands in roughly 24 chunks.
nats object info INVOICES invoice-ord_9x3m.pdf

# Get it back. The client streams the chunks in order, reassembles them,
# and verifies the SHA-256 against the stored digest before handing you a
# single file; the server only stores and replays the chunk and metadata
# messages. You never reassemble anything yourself.
nats object get INVOICES invoice-ord_9x3m.pdf --output ./invoice-ord_9x3m.pdf
