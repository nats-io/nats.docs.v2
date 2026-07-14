#!/bin/bash
# Read the kept history of a key. With history raised to 10 on this page,
# the trail behind widget-blue is now visible. Each row is one revision:
# the key, its revision number, the operation, when it was written, its
# length, and the value.
nats kv history INVENTORY widget-blue

# Expected output after the CAS decrement — two revisions kept:
#
#   History for INVENTORY > widget-blue
#
#   Key          Revision  Op   Created  Length  Value
#   widget-blue  2         PUT  ...      2       41
#   widget-blue  5         PUT  ...      2       40
#
# The revision numbers aren't consecutive — writes to widget-red and
# gadget-pro took the numbers in between — because the revision counter is
# bucket-wide, not per key. The value 42 written before the raise is gone;
# at history 1 each write dropped the one before it.
