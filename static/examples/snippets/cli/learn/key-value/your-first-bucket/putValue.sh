#!/bin/bash
# Put the stock count for widget-blue into the bucket. The key is the SKU,
# the value is the count as bytes. A put is unconditional: it writes the
# value whether or not the key already exists.
#
# This is the inventory service recording that there are 42 widget-blue
# units in stock.

nats kv put INVENTORY widget-blue 42

# The put API returns the new revision to client code; the CLI just echoes
# the value it stored. Because INVENTORY is empty, this first write lands at
# revision 1, which you can confirm with `nats kv get`. The output here is
# only the value:
#
#   42
