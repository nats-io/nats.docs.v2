#!/bin/bash
# Get the file back. `warehouse` asks for the object by name. The store
# reads the metadata for that name, streams the chunks back in order,
# reassembles them, and verifies the reassembled bytes against the stored
# SHA-256 digest before handing them over. A digest mismatch is an error,
# not a silently truncated file.
#
# Without --output the bytes are written to a file named after the object
# in the current directory.
nats object get INVOICES invoice-ord_8w2k.pdf

# Override the destination with --output. Use - to stream the bytes to
# stdout instead of writing a file.
nats object get INVOICES invoice-ord_8w2k.pdf --output ./warehouse/invoice.pdf
