#!/bin/bash
# Retrieve up to 10 messages from the shipping pull consumer. On the CLI
# nats consumer next --count is a loop of single-message pulls, not one
# batch request; --timeout (a global nats flag) bounds each pull's wait.
nats consumer next ORDERS shipping --count 10 --timeout 2s
