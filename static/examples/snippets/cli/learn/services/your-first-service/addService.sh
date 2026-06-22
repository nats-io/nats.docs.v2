#!/bin/bash
# Run the OrderInventory service. In a client library you call
# AddService(Name, Version, Description) and then AddEndpoint to bind a
# handler to a subject. From the CLI, `nats service serve` stands up a
# service for you: it registers a name and version, subscribes to the
# discovery verbs under $SRV, and answers requests on an endpoint.
#
# The endpoint joins the default queue group "q" automatically, so
# running more than one copy load-balances requests across them.
#
# Leave this running in its own terminal. It is now OrderInventory, a
# named service the network can discover, not an anonymous responder.
nats service serve OrderInventory
