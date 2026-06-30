#!/bin/bash
# Create ORDERS-ARCHIVE as a read-only mirror of the ORDERS stream.
# A mirror takes no --subjects of its own; it follows the upstream.
nats stream add ORDERS-ARCHIVE --mirror ORDERS

# Confirm the mirror caught up. The Mirror Information section reports
# the upstream stream name, the replication Lag, and the Last Seen time.
nats stream info ORDERS-ARCHIVE
