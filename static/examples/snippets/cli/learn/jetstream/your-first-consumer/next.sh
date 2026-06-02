#!/bin/bash
# Pull one message from the `shipping` consumer but skip the ack.
# --no-ack leaves the message in flight; after Ack Wait elapses it is redelivered.
nats consumer next ORDERS shipping --no-ack
