#!/bin/bash
# Consume a continuous flow from the CLI. A large --count keeps a long
# pull open so new messages are delivered the moment they land in the
# stream. --ack acknowledges each message as it is received. Ctrl-C to
# stop.
nats consumer next ORDERS shipping --count 1000 --ack
