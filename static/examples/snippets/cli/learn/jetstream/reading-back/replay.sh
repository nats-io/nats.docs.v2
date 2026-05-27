#!/bin/bash

# Replay every message stored in the ORDERS stream, from sequence 1.
# 'nats sub' against a stream-bound subject uses an ephemeral consumer
# with no ack by default.
#   --all              start at the beginning of the stream
#   --terminate-at-end stop once all stored messages have been read
nats sub "orders.>" --all --terminate-at-end
