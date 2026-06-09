#!/bin/bash
# Add a second service alongside OrderInventory.
#
# A service is created by your client library, not by the CLI: the
# library call is AddService(Name: "ShippingQuote", Version: "1.0.0")
# with one endpoint named "quote" whose subject is set to
# "shipping.quote". The CLI does not create endpoints; it talks to the
# services your code runs. This snippet shows the second service once it
# is running, the way every other language tab creates it.

# With ShippingQuote running, send a request to its endpoint. The
# service answers on shipping.quote, independent of OrderInventory.
nats service request ShippingQuote quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Confirm both services are now visible. Two independent services run
# against the same nats-server, each with its own name, version, and
# auto-generated service ID.
nats service list
