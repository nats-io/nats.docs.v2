#!/bin/bash

# Watch a subset of the bucket, not every key.
#
# A watch filter is matched against the key the same way a subject is:
# '*' stands for exactly one whole token and '>' for the rest. The SKU
# keys here are single tokens (widget-blue is one token; the hyphen is an
# ordinary character), so a prefix like 'widget-*' is NOT a wildcard and
# matches nothing. To watch a subset of flat keys, name an exact key:
nats kv watch INVENTORY widget-blue

# Expected: the snapshot shows only widget-blue at its current value, then
# it waits. A later put to gadget-pro or widget-red never reaches this
# watcher; a put to widget-blue does:
#
#   [2026-05-22 10:16:40] PUT INVENTORY > widget-blue: 41
