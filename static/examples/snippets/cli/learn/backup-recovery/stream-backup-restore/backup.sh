#!/bin/bash

# Take a point-in-time snapshot of the ORDERS stream and write it to a
# dated, off-site directory. The snapshot is two files: a backup.json
# (the stream config + state) and an S2-compressed archive carrying the
# messages -- stream.arc.s2 from a 2.15 server, stream.tar.s2 from an
# older one.
#
# --consumers includes the durable consumer config and delivery
# position, so a restore brings back not just the messages but the
# shipping and analytics consumers exactly where they were.

nats backup stream ORDERS ./backups/orders/2026-06-04 --consumers

# Expected tail of the output:
#
#   Starting backup of Stream "ORDERS" with 1 data file
#   ...
#   Received 4 MiB compressed data in 128 chunks for stream "ORDERS"
#   in 0.41s, 4.0 MiB uncompressed
#
# After this, ./backups/orders/2026-06-04/ holds backup.json and the
# archive. Ship that directory off-site (see the cron + encrypt script
# on the page) — a snapshot left next to the live cluster does not
# survive the event that takes the cluster down.
#
# On NATS 2.15 and newer, check it without a server before you trust it:
#
#   nats backup validate ./backups/orders/2026-06-04
