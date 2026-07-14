#!/bin/bash
# Put a file into the bucket. `order-svc` hands the store a name and the
# bytes; the store splits the bytes into chunks, computes a running
# SHA-256 digest as it goes, and finishes by writing one metadata message
# that records the name, size, chunk count, and digest.
#
# By default the object name is the file path exactly as you type it
# (cleaned), not just its basename: putting ./invoices/invoice-ord_8w2k.pdf
# would store the object as `invoices/invoice-ord_8w2k.pdf`. Run the command
# from the file's directory, or pass --name to control the stored name. Here
# the argument is a bare filename, so the object is stored as
# invoice-ord_8w2k.pdf.
nats object put INVOICES invoice-ord_8w2k.pdf

# You can also pipe bytes in from stdin instead of a file on disk. Then
# --name is required, because there is no filename to take the name from.
echo "PDF-bytes-for-ord_8w2k" | nats object put INVOICES --name invoice-ord_8w2k.pdf
