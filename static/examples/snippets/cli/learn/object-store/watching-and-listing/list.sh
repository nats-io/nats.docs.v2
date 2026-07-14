#!/bin/bash
# List every live object in the INVOICES bucket. `analytics` does not know
# the object names ahead of time, so it lists the bucket to discover what
# is there right now. A list is a one-time snapshot: it reads metadata for
# each object and returns — it does not stay open or stream changes.
#
# A list reads metadata only, never chunks, so it is cheap even when the
# objects themselves are large. Soft-deleted objects are filtered out: the
# list shows only what is really in the bucket.
nats object ls INVOICES

# Expected output: one row per object, metadata only, e.g.
#
#   Name                   Size     Time
#   invoice-ord_8w2k.pdf   18 KiB   2026-05-22 10:14:22
#   invoice-ord_9x3m.pdf   3.0 MiB  2026-05-22 10:15:30
#   label-ord_8w2k.png     0 B      2026-05-22 10:15:01
#
# An empty bucket is not an error — it lists zero rows. In client code an
# empty bucket surfaces as a "no objects found" condition; treat it as the
# valid answer "nothing here yet", not as a failure.
