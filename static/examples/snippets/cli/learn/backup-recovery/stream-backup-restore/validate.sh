#!/bin/bash

# A backup you have not read is a backup you do not have. From NATS 2.15
# the archive is a format the CLI can parse, so you can check a backup
# directory offline.
#
# validate walks the archive and confirms it is complete and restorable.

nats backup validate ./backups/orders/2026-06-04

# Expected output:
#
#   Validating backup in ./backups/orders/2026-06-04
#   ...
#   Backup of stream "ORDERS" is valid and restorable

# info reports what is actually inside, which is how you confirm a
# nightly job captured what you think it did:

nats backup info ./backups/orders/2026-06-04 --subjects

# Look for:
#
#   Stream:             ORDERS
#   Messages:           1,000
#   First Sequence:     1
#   Last Sequence:      1,000
#   Consumers:          2
#
# --subjects adds the per-subject message counts, so a missing
# orders.created is visible here rather than during an incident.
#
# Both commands read only the 2.15 archive format (stream.arc.s2). Point
# them at a backup taken from an older server and they refuse it; that
# backup still restores, it just cannot be inspected offline.
