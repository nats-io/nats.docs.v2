#!/bin/bash
# A bare purge removes everything. Three optional flags narrow it.

# Remove only the shipped events, leave everything else.
nats stream purge ORDERS --subject orders.shipped

# Remove everything up to but not including sequence 100 (keep 100 onward).
nats stream purge ORDERS --seq 100

# Keep only the most recent 50 messages.
nats stream purge ORDERS --keep 50
