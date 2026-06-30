#!/bin/bash

# Pitfall: you cannot switch a stream's retention to or from WorkQueue
# on a live stream. Limits and Interest can swap, but WorkQueue is fixed
# at creation. Try to move FULFILLMENT (WorkQueue) to Limits and the
# server refuses:
#   stream configuration update can not change retention policy to/from
#   workqueue
# The command exits non-zero — FULFILLMENT keeps its WorkQueue policy.
nats stream edit FULFILLMENT --retention limits --force

# The safe move is a new stream with the policy you want, then migrate.
# ORDERS itself stays Limits — never edit a live stream's retention to
# WorkQueue hoping to convert it.
nats stream info FULFILLMENT
