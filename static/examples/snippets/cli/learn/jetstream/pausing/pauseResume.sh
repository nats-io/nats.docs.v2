#!/bin/bash

# Pause the shipping consumer for one hour. The deadline accepts a
# duration ("1h", "30m") meaning "from now", or an RFC3339 timestamp
# like "2026-05-22 14:30:00" for an exact wall-clock time.
nats consumer pause ORDERS shipping "1h" --force

# Check the pause state and how much time is left on the deadline.
nats consumer info ORDERS shipping

# Resume early, before the deadline. Delivery picks up at the same
# cursor position the consumer held when it was paused.
nats consumer resume ORDERS shipping --force
