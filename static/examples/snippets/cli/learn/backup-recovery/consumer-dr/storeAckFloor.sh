#!/bin/bash

# On east: read the stream sequence of the consumer's ack floor.
# Every message up to and including this sequence has been acknowledged.
floor=$(nats --context east consumer info ORDERS shipping --json | jq .ack_floor.stream_seq)

# Store it under <stream>.<consumer>. The mirror of the bucket on west
# picks it up on its own.
nats --context east kv put SYNC_CONSUMER ORDERS.shipping "$floor"
