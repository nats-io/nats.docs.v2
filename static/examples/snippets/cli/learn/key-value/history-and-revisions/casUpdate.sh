#!/bin/bash
# Decrement widget-blue from 42 to 41 safely with compare-and-swap.
# Read the current entry, take its revision, then update on the condition
# that the key is still at that revision. If another writer got there
# first, the update is rejected and nothing is overwritten.

# The revision of the value you just read (1 after the first put).
REVISION=1

# Update succeeds only if widget-blue is still at REVISION.
nats kv update INVENTORY widget-blue 41 "$REVISION"
