#!/bin/bash

# Watch only the keys that match a wildcard, not the whole bucket.
# 'widget-*' matches widget-blue and widget-red but skips gadget-pro.
#
# The wildcard is matched against the key the same way subject tokens
# are matched: '*' covers one token. The snapshot and the live stream
# both honour the filter.
nats kv watch INVENTORY 'widget-*'

# Expected: the snapshot shows only widget-blue and widget-red.
# A later put to gadget-pro never reaches this watcher; a put to
# widget-red does:
#
#   [2026-05-22 10:16:40] PUT INVENTORY > widget-red: 17
