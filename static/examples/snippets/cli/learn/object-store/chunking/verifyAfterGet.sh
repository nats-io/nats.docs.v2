#!/bin/bash
# Always check the get result before you trust the bytes. A get reassembles
# the chunks and verifies the SHA-256 against the stored digest; if the
# stored object is incomplete (a put that failed mid-stream, or a chunk
# that never landed) the get errors instead of handing you a truncated file.
#
# `nats object get` exits non-zero on a failed reassembly or digest
# mismatch, so guard the next step on its exit code.
if nats object get INVOICES invoice-ord_9x3m.pdf --output ./invoice-ord_9x3m.pdf; then
  echo "invoice retrieved and digest verified"
else
  # The bytes are not safe to use. Re-put from the source and retry rather
  # than shipping a partial invoice.
  echo "get failed: incomplete object or digest mismatch, re-put required" >&2
  exit 1
fi
