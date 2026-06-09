#!/bin/bash

# Watch the whole INVENTORY bucket. This is the warehouse dashboard:
# it wants every stock change as it happens, with no polling.
#
# On start, watch first replays the current value of every key in the
# bucket as an initial snapshot, then blocks and streams live changes
# until you stop it (Ctrl-C). Run this in its own terminal.
nats kv watch INVENTORY

# Expected output: one line per existing key (the snapshot), e.g.
#
#   [2026-05-22 10:14:22] PUT INVENTORY > widget-blue: 42
#
# then it waits. Leave it running and put a new count from another
# terminal:
#
#   nats kv put INVENTORY widget-blue 41
#
# The watch prints the live update the moment it lands:
#
#   [2026-05-22 10:15:03] PUT INVENTORY > widget-blue: 41
