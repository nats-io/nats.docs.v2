#!/bin/bash

# Read every message the stream currently holds, in order, then stop.
# Binding 'nats sub' to the durable consumer reuses its on-disk position.
#   --stream ORDERS --durable billing  bind to the durable consumer
#   --terminate-at-end                       stop once all stored messages are read
#   --ack                                    acknowledge each message it delivers
#
# This makes no assumption about how many messages are stored: it reads
# whatever is there and stops when 'pending' reaches 0.
nats sub --stream ORDERS --durable billing --terminate-at-end --ack
