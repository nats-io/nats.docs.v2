#!/bin/bash

# Subscribes to all weather updates
nats sub 'weather.>'

# Matches:
# ✓ weather.us
# ✓ weather.us.california
# ✓ weather.us.california.sandiego
