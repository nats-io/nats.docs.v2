#!/bin/bash
# Put a new value for the same key. This is a normal put: it overwrites
# whatever was there.

nats kv put profiles sue.color green

# You should see the new value echoed back:
#
#   green
#
# In the terminal running the watch, a new line appears the instant this
# lands:
#
#   [2026-06-09 10:15:03] PUT profiles > sue.color: green
