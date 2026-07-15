#!/bin/bash
# Fetch a batch of up to 10 messages from the shipping pull consumer,
# waiting up to 2 seconds for them. nats consumer next is a single
# fetch; --count is the batch size, --wait is the timeout.
nats consumer next ORDERS shipping --count 10 --wait 2s
