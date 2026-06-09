#!/bin/bash
# Put the stock count for widget-blue into the bucket. The key is the SKU,
# the value is the count as bytes. A put is unconditional: it writes the
# value whether or not the key already exists.
#
# This is the inventory service recording that there are 42 widget-blue
# units in stock.

nats kv put INVENTORY widget-blue 42

# The put returns the new revision of the key. The first write to a fresh
# key lands at revision 1:
#
#   INVENTORY > widget-blue revision: 1 created @ ...
