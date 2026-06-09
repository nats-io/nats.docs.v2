#!/bin/bash
# The inventory service: subscribe to orders.inventory.check and answer
# every request. `nats reply` subscribes to the subject and publishes the
# given body to whatever inbox each request carries.
#
# Leave this running in its own terminal. It answers every request with
# an in-stock reply until you stop it with Ctrl-C.
nats reply orders.inventory.check '{"in_stock":true,"warehouse":"us-east"}'
