#!/bin/bash
# Read the ObjectInfo for one object. `nats object info` prints the
# metadata you set (description, headers, metadata map) alongside the
# fields the store computed for you: size, chunk count, the SHA-256
# digest, the modification time, and whether the object is deleted.
#
# `warehouse` reads this before fetching the bytes — the content-type
# header tells it the object is a PDF, and the size tells it how big the
# get will be.
nats object info INVOICES invoice-ord_8w2k.pdf

# Expected output (abridged):
#
#   Object information for INVOICES > invoice-ord_8w2k.pdf
#
#              Size: 12 KiB
#      Modified: 2026-05-22 10:14:22
#         Chunks: 1
#         Digest: SHA-256=...
#   Description: Invoice for order ord_8w2k
#          Headers: content-type: application/pdf
