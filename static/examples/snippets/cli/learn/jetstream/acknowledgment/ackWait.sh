#!/bin/bash
# Set the two server-side ack controls on the shipping consumer.
#
#   --ack=explicit   each message must be answered on its own
#   --wait=10s       AckWait: redeliver if no answer within 10 seconds
#   --max-deliver=5  cap delivery attempts at 5 (default -1 = unlimited)
nats consumer edit ORDERS shipping \
  --ack=explicit \
  --wait=10s \
  --max-deliver=5

# Read the controls back. Look for: Ack Wait, Maximum Deliveries.
nats consumer info ORDERS shipping
