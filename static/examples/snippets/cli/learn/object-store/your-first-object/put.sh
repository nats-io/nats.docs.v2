#!/bin/bash
# Put a file into the bucket. `order-svc` hands the store a name and the
# bytes; the store splits the bytes into chunks, computes a running
# SHA-256 digest as it goes, and finishes by writing one metadata message
# that records the name, size, chunk count, and digest.
#
# By default the object name is the file's basename. Here the file on
# disk is named invoice-ord_8w2k.pdf, so the object is stored under that
# name. Use --name to store under a different name.
nats object put INVOICES invoice-ord_8w2k.pdf

# You can also pipe bytes in from stdin instead of a file on disk. Then
# --name is required, because there is no filename to take the name from.
echo "PDF-bytes-for-ord_8w2k" | nats object put INVOICES --name invoice-ord_8w2k.pdf
