#!/bin/bash
# Add a link from one object to another. A link is an object whose target
# is another object (or a whole bucket); a get on the link transparently
# returns the target's bytes. Here `label-ord_8w2k.png` is a link that
# points at the invoice, so fetching the label hands back the invoice.
#
# Adding a link is a client-library operation (AddLink / AddBucketLink);
# the `nats` CLI has no link subcommand, so this snippet shows the shape
# with a client. The store records the target {bucket, name} at creation
# time, then traverses it on get.
#
# Pseudocode (the JS/Go/Python/Rust/Java/C# tabs show the real call):
#
#   invoice = os.GetInfo("invoice-ord_8w2k.pdf")
#   os.AddLink("label-ord_8w2k.png", invoice)
#
# A get on the link returns the invoice bytes, traversed for you:
nats object get INVOICES label-ord_8w2k.png --output ./label-target.pdf

# A bucket link points at a whole bucket instead of one object: pass an
# empty target name and the link resolves to the bucket on get. Reach for
# a bucket link when you want a stable alias for the store, not one file.
