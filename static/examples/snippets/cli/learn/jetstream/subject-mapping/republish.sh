#!/bin/bash

# Republish re-emits every message the stream stores onto a second subject,
# in real time. A plain core subscriber on that subject sees the data flow
# by without creating a consumer. This adds republish to ORDERS; clear it
# later with: nats stream edit ORDERS --no-republish
nats stream edit ORDERS \
  --republish-source "orders.>" \
  --republish-destination "dash.orders.>"
