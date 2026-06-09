#!/bin/bash

# A deadline in the past is a no-op: the consumer is not paused. The CLI
# tells you exactly that instead of silently doing nothing.
nats consumer pause ORDERS shipping "2020-01-01 00:00:00" --force
# Output: consumer failed to pause, perhaps a time in the past was given

# Use a future deadline. A duration like "1h" is always "from now", so it
# can never land in the past.
nats consumer pause ORDERS shipping "1h" --force

# Confirm the pause took, with the deadline and time remaining.
nats consumer info ORDERS shipping
