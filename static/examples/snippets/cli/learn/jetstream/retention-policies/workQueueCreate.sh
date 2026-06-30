#!/bin/bash

# A WorkQueue stream for the shipping work. Leave ORDERS alone — that's
# the record. FULFILLMENT is a separate queue of paid orders waiting to
# ship, worked by the shipping workers from the Scaling a consumer page.

# --retention work sets the WorkQueue policy. natscli accepts "work" and
# "workq" as aliases. Under WorkQueue a message is removed the moment the
# first consumer acks it, so the queue drains as the workers keep up.
nats stream add FULFILLMENT \
  --subjects "fulfill.>" \
  --retention work \
  --defaults

# Inspect it — the Options block now reads Retention: WorkQueue, where
# ORDERS reads Retention: Limits.
nats stream info FULFILLMENT

# Enqueue one order to ship, then have a shipping worker pull and ack it.
# After the ack the task is gone — the message count drops back to zero,
# which no limit on a Limits stream like ORDERS would ever do.
nats pub fulfill.us '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats consumer add FULFILLMENT shippers --pull --ack explicit --defaults
nats consumer next FULFILLMENT shippers --count 1 --ack

# Confirm the ack removed the task: Messages is back to 0.
nats stream info FULFILLMENT
