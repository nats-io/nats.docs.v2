#!/bin/bash

# Check a mapping without a running server. `nats server mappings` takes a
# source pattern, a destination pattern, and a subject, runs the same
# transform code the server uses, and prints the result. It opens no
# connection, so you can try a mapping before you ever put it in config.

# A literal rename: orders.placed always maps to orders.created.
nats server mappings "orders.placed" "orders.created" orders.placed

# A token reference: {{wildcard(1)}} pulls the token the first * matched into
# the destination, so orders.legacy.us becomes orders.us.created.
nats server mappings "orders.legacy.*" "orders.{{wildcard(1)}}.created" orders.legacy.us
