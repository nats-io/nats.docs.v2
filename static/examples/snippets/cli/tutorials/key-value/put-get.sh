#!/bin/bash
# Put a value: the key is sue.color, the value is blue.

nats kv put profiles sue.color blue

# You should see the value echoed back with its revision:
#
#   blue

# Get the value back out by its key.

nats kv get profiles sue.color

# You should see the full entry, including the value:
#
#   profiles > sue.color revision: 1 created @ ...
#
#   blue
