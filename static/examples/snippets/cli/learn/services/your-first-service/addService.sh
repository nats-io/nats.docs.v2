#!/bin/bash
# Create the OrderInventory service. This is a client-library call, not a
# CLI one: your code calls AddService(Name: "OrderInventory",
# Version: "1.0.0", Description: ...) and then AddEndpoint("check", handler)
# with the subject set to "orders.inventory.check". The framework opens the
# subscriptions, joins the endpoint to the default queue group "q", and
# subscribes the discovery verbs under $SRV.
#
# The CLI cannot host this shape: `nats service serve` only runs a demo
# echo service on <name>.echo, not a named endpoint on a subject you choose.
# So start OrderInventory from your service program, then use the CLI to
# talk to it. With the service running, read its registration back:
nats service info OrderInventory
