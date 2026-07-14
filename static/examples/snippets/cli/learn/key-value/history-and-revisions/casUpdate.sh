#!/bin/bash
# Decrement widget-blue from 41 to 40 safely with compare-and-swap.
# Read the current entry, take its revision, then update on the condition
# that the key is still at that revision. If another writer got there
# first, the update is rejected and nothing is overwritten.

# Read the current revision from a get. The get prints a header line
# "... revision: N created @ ..." followed by the value, so pull N from it.
REVISION=$(nats kv get INVENTORY widget-blue | sed -n 's/.*revision: \([0-9]*\).*/\1/p')

# Update succeeds only if widget-blue is still at REVISION.
nats kv update INVENTORY widget-blue 40 "$REVISION"
