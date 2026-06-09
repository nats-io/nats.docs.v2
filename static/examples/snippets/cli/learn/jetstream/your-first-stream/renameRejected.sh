#!/bin/bash
# A stream name is permanent. There is no rename, and `nats stream edit`
# has no --name flag. The server rejects any update that changes the
# name of an existing stream:
#
#   nats: error: stream configuration name must match original
#
# To "rename" ORDERS you would delete it and create a new stream — which
# loses every message already stored. So pick the name deliberately the
# first time.
#
# The safe operation is to add a new stream under the right name and let
# new messages flow there, leaving the old stream to age out.
nats stream add ORDERS_V2 --subjects "orders.v2.>" --defaults
