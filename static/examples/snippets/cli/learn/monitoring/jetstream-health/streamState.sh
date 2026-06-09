#!/bin/bash
# Read the live state of the ORDERS stream.
# LastSeq is the sequence of the newest stored order; you need it to
# compute how far behind any consumer is.
nats stream info ORDERS

# The same state as JSON, narrowed to the fields that matter for lag.
nats stream info ORDERS --json | \
  jq '.state | {messages, last_seq, first_seq, num_subjects}'
