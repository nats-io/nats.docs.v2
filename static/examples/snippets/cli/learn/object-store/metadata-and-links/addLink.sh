#!/bin/bash
# Add a link from one object to another. A link is an object whose target
# is another object; a get on the link transparently returns the target's
# bytes. Here `label-ord_8w2k.png` is a link that points at the invoice, so
# fetching the label hands back the invoice.
#
# Adding a link is a client-library operation (AddLink / AddBucketLink); the
# `nats` CLI has no link subcommand, so this snippet is illustration only —
# it shows the shape of the call with a client. The store records the target
# {bucket, name} at creation time, then traverses it on get.
#
# Pseudocode:
#
#   invoice = os.GetInfo("invoice-ord_8w2k.pdf")
#   os.AddLink("label-ord_8w2k.png", invoice)
#
# Once the link exists, a client get on the link name returns the invoice
# bytes, traversed for you:
#
#   os.Get("label-ord_8w2k.png")   # returns the invoice's bytes

# A bucket link points at a whole bucket instead of one object: pass an
# empty target name. It stores only a reference to the other bucket, so a
# get on a bucket link returns an error (ErrCantGetBucket in Go), not bytes.
# Read the link's info to learn the target bucket, then open that bucket
# yourself. Reach for a bucket link when you want a stored pointer to
# another store, not a gettable object.
