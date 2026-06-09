#!/bin/bash
# Ask the OrderInventory service to describe itself. INFO is a discovery
# verb every service answers automatically on the $SRV subject tree. The
# name level ($SRV.INFO.OrderInventory) reaches every running instance of
# OrderInventory, and each one replies with its name, id, version, and the
# list of endpoints it serves.
#
# Discovery is broadcast: a plain request would return only the first
# reply, so the CLI waits a short window and collects every responder.
# That is why the timeout matters here.
nats request '$SRV.INFO.OrderInventory' '' --replies=0 --timeout=1s

# The reply for each instance is JSON like:
#
#   {
#     "type": "io.nats.micro.v1.info_response",
#     "name": "OrderInventory",
#     "id": "JJTBR2MN3JSAYBI5ST7E32",
#     "version": "1.0.0",
#     "endpoints": [
#       { "name": "check",
#         "subject": "orders.inventory.check",
#         "queue_group": "q" }
#     ]
#   }
#
# Read the endpoints array to learn what the service answers and on which
# subject -- no documentation lookup required.
#
# The same information, formatted, comes from the CLI ops shortcut:
nats service info OrderInventory
