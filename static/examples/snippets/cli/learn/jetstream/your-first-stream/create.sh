#!/bin/bash

# Create the ORDERS stream, capturing every subject under orders.>
# --defaults fills in the remaining config with sensible starting values.
nats stream add ORDERS --subjects "orders.>" --defaults

# Expected: output ending with
#   Stream ORDERS was created
