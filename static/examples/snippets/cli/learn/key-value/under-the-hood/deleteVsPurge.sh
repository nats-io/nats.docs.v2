#!/bin/bash

# Delete and purge both make a key read empty, but they keep different
# amounts of history. The difference matters when the prior values are
# sensitive or when the bucket is filling up.

# Delete leaves a non-destructive marker. The key reads empty, but every
# prior revision is still in the backing stream and still readable through
# history.
nats kv del INVENTORY widget-blue

# A get now reports the key is deleted, yet history still shows the
# revisions that came before:
nats kv history INVENTORY widget-blue
#
# Expected output: the kept PUT revisions PLUS a final DELETE marker
# (columns abbreviated here):
#
#   Key          Revision  Op      Value
#   widget-blue  2         PUT     41
#   widget-blue  5         PUT     40
#   widget-blue  9         DELETE
#
# The values are still on disk, up to the bucket's history depth (raised to
# 10 on the history-and-revisions page). Delete is reversible knowledge: a
# deleted key can be put again, and its past is intact.

# Purge is destructive. It drops every prior revision for the key and
# leaves a single rollup marker behind, so history collapses to one entry.
nats kv purge INVENTORY widget-red

nats kv history INVENTORY widget-red
#
# Expected output: a single PURGE marker, the prior value gone
# (columns abbreviated here):
#
#   Key         Revision  Op     Value
#   widget-red  10        PURGE
#
# Reach for purge when you must actually remove the old values (size or
# privacy); reach for delete when "this key is gone for now" is enough.
