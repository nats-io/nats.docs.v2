#!/bin/bash

# Before trusting ORDERS in production, confirm how many copies exist.
# nats stream info reports the Replicas count; on a single-node laptop
# this is 1, which means no fault tolerance.
nats stream info ORDERS

# Pull out just the replica count for a fast, scriptable check. A value
# of 1 is R=1 — a single point of failure. Treat anything below 3 as a
# warning sign for a stream that holds real orders.
nats stream info ORDERS --json | grep '"num_replicas"'
