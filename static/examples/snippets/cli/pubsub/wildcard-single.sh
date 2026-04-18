#!/bin/bash

# Subscribes to all US weather updates
nats sub 'weather.us.*'

# Matches:
# ✓ weather.us.california
# ✓ weather.us.newyork
# ✗ weather.us.california.sandiego (too many tokens)
