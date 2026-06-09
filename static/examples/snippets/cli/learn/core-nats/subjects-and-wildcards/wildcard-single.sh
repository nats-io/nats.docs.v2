#!/bin/bash

# Regional analytics: catch created orders from every region with one
# subscription. The single-token wildcard * matches exactly one token in
# the region position, so orders.us.created and orders.eu.created both
# match, while orders.created and orders.us.west.created do not.
nats sub "orders.*.created"
