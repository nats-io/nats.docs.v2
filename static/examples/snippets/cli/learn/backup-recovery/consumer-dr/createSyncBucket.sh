#!/bin/bash

# On east: the bucket that holds each consumer's ack floor.
# One value per key is enough; only the latest position matters.
nats --context east kv add SYNC_CONSUMER --history 1 --replicas 3

# On west: a mirror of that bucket, read from the east domain.
nats --context west kv add SYNC_CONSUMER --mirror SYNC_CONSUMER --mirror-domain east --replicas 3
