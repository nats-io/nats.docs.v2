#!/bin/bash
# Set the chunk size on a put and watch the chunk count change. The same
# 3 MB `invoice-ord_9x3m.pdf` splits into more or fewer messages depending
# on where you draw the split boundary. The `--chunk-size` flag takes a
# plain byte count, and these are re-puts over the existing object, so pass
# `--force` to skip the replace prompt.
#
# A small chunk size makes many messages. Here 64 KB (65536 bytes) roughly
# doubles the chunk count versus the 128 KB default — more per-message
# overhead.
nats object put INVOICES invoice-ord_9x3m.pdf --chunk-size 65536 --force
nats object info INVOICES invoice-ord_9x3m.pdf

# A larger chunk size makes fewer messages. Keep each chunk under the
# server's maximum payload (max_payload, 1 MB by default); a chunk larger
# than that is rejected and the put fails. Here 512 KB (524288 bytes) stays
# well under the limit.
#
# The full set of chunk-size options is documented in
# [Reference](/reference/). We only need the behavior here.
nats object put INVOICES invoice-ord_9x3m.pdf --chunk-size 524288 --force
nats object info INVOICES invoice-ord_9x3m.pdf
