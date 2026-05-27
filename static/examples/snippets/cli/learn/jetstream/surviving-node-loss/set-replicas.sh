#!/bin/bash

# Raise the ORDERS stream to three replicas (R=3), the production floor.
# Three copies live on three servers; the loss of any one server costs
# no data, and the stream keeps serving reads and writes.
#
# This command REQUIRES a clustered NATS deployment of at least three
# servers. On a single-node server it is rejected, because there are no
# three servers to hold the three copies.
nats stream edit ORDERS --replicas=3

# Inspect the result. On a cluster, the report gains a Cluster section
# naming the leader and the replicas, alongside the Replicas count.
nats stream info ORDERS
