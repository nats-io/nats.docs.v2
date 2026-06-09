#!/bin/bash
# Set the chunk size on a put and watch the chunk count change. The same
# 3 MB `invoice-ord_9x3m.pdf` splits into more or fewer messages depending
# on where you draw the split boundary.
#
# A small chunk size makes many messages. Here 64 KB roughly doubles the
# chunk count versus the 128 KB default — more per-message overhead.
nats object put INVOICES invoice-ord_9x3m.pdf --chunk-size 64KB
nats object info INVOICES invoice-ord_9x3m.pdf

# A large chunk size makes few messages — until it exceeds the backing
# stream's max message size, which rejects the put. The chunk size is
# clamped to that stream limit, so pushing it too high fails the store
# rather than silently splitting differently.
#
# The full set of chunk-size options is documented in
# [Reference](/reference/). We only need the behavior here.
nats object put INVOICES invoice-ord_9x3m.pdf --chunk-size 1MB
nats object info INVOICES invoice-ord_9x3m.pdf
