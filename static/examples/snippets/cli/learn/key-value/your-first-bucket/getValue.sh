#!/bin/bash
# Get widget-blue back. By default a get returns the whole entry: the
# value plus its revision and timestamp. --raw asks for only the value
# bytes, which is what a program usually wants.

nats kv get INVENTORY widget-blue --raw

# Prints just the value:
#
#   42

# Without --raw you see the full entry the server returns:
nats kv get INVENTORY widget-blue

#   INVENTORY > widget-blue created @ ...
#
#   42
#
# A get for a key that was never put fails with a key-not-found error,
# which is distinct from a key whose value is empty. Check for that error
# before using the value:
nats kv get INVENTORY widget-green --raw || echo "widget-green not in stock yet"
