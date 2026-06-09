#!/bin/bash

# Take a point-in-time snapshot of the ORDERS stream and write it to a
# dated, off-site directory. The snapshot is two files: a backup.json
# (the stream config + state) and a chunked, S2-compressed tarball
# (stream.tar.s2) carrying the messages.
#
# --consumers includes the durable consumer config and delivery
# position, so a restore brings back not just the messages but the
# shipping and analytics consumers exactly where they were.

nats stream backup ORDERS ./backups/orders/2026-06-04 --consumers

# Expected tail of the output:
#
#   Starting backup of Stream "ORDERS" with 1 data file
#   ...
#   Received 4 MiB compressed data in 128 chunks for stream "ORDERS"
#   in 0.41s, 4.0 MiB uncompressed
#   Backup of "ORDERS" took 0.41s
#
# After this, ./backups/orders/2026-06-04/ holds backup.json and
# stream.tar.s2. Ship that directory off-site (see the cron + encrypt
# script on the page) — a snapshot left next to the live cluster does
# not survive the event that takes the cluster down.
