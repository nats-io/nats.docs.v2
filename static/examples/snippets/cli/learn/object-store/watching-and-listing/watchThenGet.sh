#!/bin/bash
# Watch tells you WHAT changed; get gives you the bytes. A watch update is
# an ObjectInfo record — name, size, chunk count, digest — and never the
# object's data. The chunks live on a separate subject, so the bytes do
# not ride the watch. This keeps watch cheap even for gigabyte objects.
#
# The pattern is two steps: watch to learn what changed, then get only the
# objects whose bytes you actually need. Do not expect the data to arrive
# on the watch.
#
# Step 1 — watch for changes (run in its own terminal, leave it running):
nats object watch INVOICES

# The watch prints a metadata line when `order-svc` puts a new object,
# e.g.
#
#   [2026-05-22 10:16:40] PUT INVOICES > packing-slip-ord_8w2k.txt
#
# Step 2 — now that you know what changed, get the bytes you want. Run
# this from another terminal for the object the watch reported. Without
# --output the file lands in the current directory under the object's name;
# --output writes it to a path you choose (the directory must exist):
nats object get INVOICES packing-slip-ord_8w2k.txt --output ./packing-slip-ord_8w2k.txt

# In client code the loop reads the watch, branches on the nil sentinel
# (the snapshot/live boundary) and keeps going, then issues a get only for
# the objects it needs:
#
#   for info in watcher:
#       if info is None:                 # caught-up sentinel; keep reading
#           continue
#       if needs_bytes(info.name):       # only fetch what you actually use
#           data = bucket.get_bytes(info.name)
#
# Reading the bytes directly off the watch update would find only
# metadata. Use watch to learn what, get to fetch the data.
