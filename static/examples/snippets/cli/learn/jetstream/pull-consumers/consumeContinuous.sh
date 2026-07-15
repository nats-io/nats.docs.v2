#!/bin/bash
# Consume a continuous flow from the CLI. nats consumer next exits after
# --timeout of quiet, so wrap it in a loop to keep going as new messages
# land. --ack acknowledges each message as it is received. Ctrl-C stops
# the loop.
while true; do
  nats consumer next ORDERS shipping --count 100 --ack --timeout 5s || sleep 1
done
