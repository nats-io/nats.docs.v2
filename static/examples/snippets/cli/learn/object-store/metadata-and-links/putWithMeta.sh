#!/bin/bash
# Put an invoice with metadata attached. Beyond the bytes, every object
# carries an ObjectInfo record. Three of its fields are yours to set:
#   --description  a human label for the object
#   -H / --header  HTTP-style headers (repeatable)
# and a free-form metadata map, set in the client libraries.
#
# Here `order-svc` stores invoice-ord_8w2k.pdf with a description and a
# content-type header so a reader knows the bytes are a PDF without
# downloading them first.
nats object put INVOICES invoice-ord_8w2k.pdf \
  --description "Invoice for order ord_8w2k" \
  --header "content-type:application/pdf"

# The metadata travels in the one metadata message that follows the
# chunks, so it costs nothing extra to read it back later — it is already
# beside the object, not in a separate lookup.
