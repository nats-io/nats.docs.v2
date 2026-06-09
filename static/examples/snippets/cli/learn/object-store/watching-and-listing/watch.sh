#!/bin/bash
# Watch the INVOICES bucket for changes. This is the `analytics` service:
# it wants to learn about every new invoice the instant `order-svc` puts
# it, with no polling.
#
# A watch delivers metadata updates in order, one per change (put, re-put,
# or delete). When it has caught up with everything already in the bucket,
# it delivers a single nil sentinel to mark the snapshot/live boundary,
# then streams live changes until you stop it (Ctrl-C). The CLI consumes
# the sentinel for you and keeps printing. Run this in its own terminal.
nats object watch INVOICES

# Expected output: one line per existing object (the catch-up snapshot),
# then it waits. Leave it running and, from another terminal, have
# `order-svc` put the packing slip for the same order:
#
#   echo "PACK ord_8w2k: 3 items" | \
#     nats object put INVOICES --name packing-slip-ord_8w2k.txt
#
# The watch prints the live metadata update the moment the put lands:
#
#   [2026-05-22 10:16:40] PUT INVOICES > packing-slip-ord_8w2k.txt
#
# Each update carries the object's metadata — name, size, chunk count,
# digest — never the chunk bytes. To read the data, issue a separate get.
