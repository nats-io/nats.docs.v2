#!/bin/bash
# Organize endpoints under a group subject prefix.
#
# Grouping is a library call: AddGroup("orders.inventory") returns a
# group, and an endpoint named "check" added to that group answers on
# {group}.{endpoint} = orders.inventory.check. The CLI does not build
# groups; it sends to the subject the group produced. This snippet shows
# that the grouped endpoint answers on the joined subject, exactly as the
# other language tabs construct it.

# The grouped "check" endpoint answers on orders.inventory.check — the
# group prefix joined to the endpoint name. A caller only needs the
# subject; it never sees whether a group built it.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Read back the service to see each endpoint's resolved subject. The
# subject column shows orders.inventory.check, the group prefix applied.
nats service info OrderInventory
