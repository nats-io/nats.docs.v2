#!/bin/bash
# MaxAckPending is the ceiling on delivered-but-unacked messages across
# the WHOLE pool, not per worker. Set it too low and a large pool sits
# idle waiting for a slot. Size it to at least your worker count.

# Check the current cap. Look for "Outstanding Acks: N out of maximum M"
# in the output. M is MaxAckPending.
nats consumer info ORDERS shipping

# Raise the cap so every worker can hold a message at once, with room
# to spare. For ten shipping workers, a few thousand is comfortable.
nats consumer edit ORDERS shipping --max-pending 5000
