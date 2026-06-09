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
# Expected output: the old PUT revisions PLUS a final DEL marker, e.g.
#
#   REV  OP   VALUE
#   1    PUT  42
#   2    DEL
#
# The values are still on disk. Delete is reversible knowledge: a deleted
# key can be put again, and its past is intact.

# Purge is destructive. It drops every prior revision for the key and
# leaves a single rollup marker behind, so history collapses to one entry.
nats kv purge INVENTORY widget-red

nats kv history INVENTORY widget-red
#
# Expected output: a single PURGE marker, the prior values gone:
#
#   REV  OP     VALUE
#   3    PURGE
#
# Reach for purge when you must actually remove the old values (size or
# privacy); reach for delete when "this key is gone for now" is enough.
