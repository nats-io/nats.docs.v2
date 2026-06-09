#!/bin/bash

# A named, durable replay that survives a disconnect mid-read.
# Unlike the ephemeral consumer 'nats sub --all' creates, a durable
# consumer keeps its cursor on the server, so reconnecting resumes
# where it left off instead of restarting from sequence 1.

# Create a durable consumer that starts at the beginning of ORDERS.
#   --deliver all  start at sequence 1 (server default DeliverAll)
#   --pull         pull-based delivery; ask for messages on demand
#   --ack explicit acknowledge each message so the cursor advances
nats consumer add ORDERS replay-reader \
  --deliver all \
  --pull \
  --ack explicit \
  --defaults

# Drain the stored messages. Run this again after a disconnect and it
# picks up from the last acked message rather than from sequence 1.
nats consumer next ORDERS replay-reader --count 3 --ack
