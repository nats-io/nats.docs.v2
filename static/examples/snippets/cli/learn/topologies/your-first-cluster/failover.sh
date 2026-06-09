#!/bin/bash
# Connect to the `east` cluster with ALL THREE servers as seed URLs, then
# survive the loss of the server the client lands on.
#
# The client connects to one of the three, discovers the other two from the
# server's INFO message, and when its server stops it reconnects to a
# survivor and keeps publishing. The orders.* traffic never has to stop.

# Point the CLI at all three servers in `east`. The list is the seed; the
# client learns the rest via server discovery.
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# In one terminal, subscribe to the orders so you can watch delivery
# continue through the failover (it may reconnect to a different server too).
nats sub "orders.>" &

# Publish a steady stream of orders, one per second, forever. Leave this
# running while you kill a server in another terminal.
while true; do
  nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
  sleep 1
done

# In ANOTHER terminal, kill the server the client is connected to. Find the
# nats-server processes and stop the one on the client's port, e.g. n1-east:
#   pkill -f n1-east.conf
#
# The publisher above logs a brief reconnect and then keeps going against a
# surviving server. No orders are lost in transit; the loss of one server is
# a reconnect, not an outage.
