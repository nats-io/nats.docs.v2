#!/bin/bash

# Subscribe to orders.created as a member of the "packers" queue group.
# The --queue flag names the group; every subscriber that names the same
# group on the same subject shares the load. Each published order is
# delivered to exactly one member of the group, chosen at random.
#
# Run this command in several terminals to watch the load balance: each
# order lands in only one of the running copies.
nats sub orders.created --queue packers
