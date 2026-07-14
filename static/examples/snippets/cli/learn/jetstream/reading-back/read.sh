#!/bin/bash

# Read every message the stream currently holds, in order, then stop.
# Binding 'nats sub' to the durable consumer reuses its on-disk position.
#   --stream ORDERS --durable billing  bind to the durable consumer
#   --terminate-at-end                 stop once all stored messages are read
#
# The CLI acknowledges each message automatically because the billing
# consumer was created with an explicit ack policy; its position advances
# as those acks arrive. It reads whatever is stored and stops when
# 'pending' reaches 0.
nats sub --stream ORDERS --durable billing --terminate-at-end
