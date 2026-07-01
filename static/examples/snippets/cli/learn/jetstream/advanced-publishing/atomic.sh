#!/bin/bash
# Atomic batch publish from the CLI. The stream must be created with
# --allow-batch (AllowAtomicPublish). The --atomic flag reads one message per
# line from STDIN and commits the whole batch at end of input: either all three
# line items land together, or none of them do.
printf '%s\n' \
  '{"order_id":"ord_8w2k","line":"sku-1"}' \
  '{"order_id":"ord_8w2k","line":"sku-2"}' \
  '{"order_id":"ord_8w2k","line":"sku-3"}' \
  | nats pub --atomic --send-on=newline --force-stdin orders.created

# Prints e.g. `Wrote batch ID: heTjQHWT0emRc98Os9nUtx Messages: 3 Sequence: 3`.
# The batch is committed as a unit; a sequence gap or a stall abandons it whole.
