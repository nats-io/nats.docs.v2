#!/bin/bash

# Pause the shipping consumer for one hour. The deadline accepts a
# duration ("1h", "30m") meaning "from now", or a timestamp in
# "YYYY-MM-DD HH:MM:SS" form for an exact wall-clock time.
nats consumer pause ORDERS shipping "1h" --force

# Check the pause state and how much time is left on the deadline.
nats consumer info ORDERS shipping

# Resume early, before the deadline. Delivery picks up at the same
# cursor position the consumer held when it was paused.
nats consumer resume ORDERS shipping --force
