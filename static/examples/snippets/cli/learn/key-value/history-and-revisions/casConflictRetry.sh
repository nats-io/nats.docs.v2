#!/bin/bash
# CAS retry loop. A rejected update is dropped, not queued, so on a
# revision mismatch re-get the key and retry with the fresh revision.
# Here the inventory service decrements widget-blue by one, safely.

# Read the value AND its revision from a SINGLE get, so the pair is
# consistent. Two separate gets could pair a stale value with a fresh
# revision if a concurrent write landed in between. The get prints a header
# line "... revision: N created @ ..." then a blank line then the value.
ENTRY=$(nats kv get INVENTORY widget-blue)
VALUE=$(printf '%s\n' "$ENTRY" | tail -n1)
REVISION=$(printf '%s\n' "$ENTRY" | sed -n 's/.*revision: \([0-9]*\).*/\1/p')
NEW_VALUE=$((VALUE - 1))

# Try the update; if a concurrent writer bumped the revision, re-get and retry once.
if nats kv update INVENTORY widget-blue "$NEW_VALUE" "$REVISION"; then
  echo "decremented widget-blue to $NEW_VALUE"
else
  echo "revision conflict, re-getting and retrying"
  ENTRY=$(nats kv get INVENTORY widget-blue)
  VALUE=$(printf '%s\n' "$ENTRY" | tail -n1)
  REVISION=$(printf '%s\n' "$ENTRY" | sed -n 's/.*revision: \([0-9]*\).*/\1/p')
  NEW_VALUE=$((VALUE - 1))
  nats kv update INVENTORY widget-blue "$NEW_VALUE" "$REVISION"
fi
