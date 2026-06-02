#!/bin/bash
# A worker loop for the shipping consumer.
# Run this same loop in three separate terminals to form a pool of
# three workers. All three share the one "shipping" consumer, and the
# server splits the stored messages across them.

# Each pass: pull one message, "process" it, and acknowledge it.
# --count 1 pulls a single message at a time.
# --ack acknowledges the message after it is received.
while true; do
  nats consumer next ORDERS shipping --count 1 --ack
done

# Publish work from a fourth terminal and watch it spread across the
# three running loops:
#   nats pub orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
#
# To see in-flight redelivery: stop one worker (Ctrl-C) right after it
# pulls a message but before it acks. After AckWait (30s default), the
# server redelivers that message to one of the surviving workers.
