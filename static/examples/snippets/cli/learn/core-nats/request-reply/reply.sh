#!/bin/bash
# The inventory service, started in echo mode. With no body, `nats reply`
# echoes each request's payload straight back on its inbox. Useful for a
# quick round-trip check: send an order and watch the same bytes return.
nats reply orders.inventory.check
