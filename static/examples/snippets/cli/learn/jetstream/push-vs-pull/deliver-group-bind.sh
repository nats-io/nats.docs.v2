#!/bin/bash
# A deliver group is a core NATS queue group on the deliver subject.
# It only splits load among subscribers that JOIN that queue group.

# This push consumer names a deliver group, "shippers".
nats consumer add ORDERS legacy-notify \
  --target push.orders.notify \
  --deliver-group shippers \
  --ack explicit

# WRONG: a plain subscriber ignores the group and receives the full firehose,
# so two of these each get every message instead of sharing.
# nats sub push.orders.notify

# RIGHT: join the same queue group with --queue, and the server splits
# delivery across every subscriber in the group, one message to one member.
nats sub push.orders.notify --queue shippers
