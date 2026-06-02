#!/bin/bash

# Pause the shipping consumer until a deadline. The deadline can be a
# duration ("1h", "30m") meaning "from now", or an RFC3339 timestamp
# like "2026-05-22 14:30:00" for an exact wall-clock time.
# --force skips the confirmation prompt. Requires NATS Server 2.11+.
nats consumer pause ORDERS shipping "1h" --force
