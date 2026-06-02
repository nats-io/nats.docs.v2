#!/bin/bash

# Create a WorkQueue-retention stream for contrast with ORDERS.
# --retention work selects the WorkQueue policy (natscli also accepts
# "workq"; both map to WorkQueue). A message lives until the first
# consumer acks it, then it is removed.
nats stream add JOBS \
  --subjects "jobs.>" \
  --retention work \
  --defaults
