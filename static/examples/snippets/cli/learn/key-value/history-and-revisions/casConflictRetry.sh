#!/bin/bash
# CAS retry loop. A rejected update is dropped, not queued, so on a
# revision mismatch re-get the key and retry with the fresh revision.
# Here the inventory service decrements widget-blue by one, safely.

# Read the current value and its revision.
VALUE=$(nats kv get INVENTORY widget-blue --raw)
REVISION=$(nats kv get INVENTORY widget-blue | awk '/Revision/ {print $NF}')
NEW_VALUE=$((VALUE - 1))

# Try the update; if a concurrent writer bumped the revision, re-get and retry once.
if nats kv update INVENTORY widget-blue "$NEW_VALUE" "$REVISION"; then
  echo "decremented widget-blue to $NEW_VALUE"
else
  echo "revision conflict, re-getting and retrying"
  VALUE=$(nats kv get INVENTORY widget-blue --raw)
  REVISION=$(nats kv get INVENTORY widget-blue | awk '/Revision/ {print $NF}')
  NEW_VALUE=$((VALUE - 1))
  nats kv update INVENTORY widget-blue "$NEW_VALUE" "$REVISION"
fi
