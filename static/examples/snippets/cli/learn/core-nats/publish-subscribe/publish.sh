#!/bin/bash
# Publish one order to the orders.created subject. The publish is
# fire-and-forget: nats pub hands the message to the server and exits.
# It does not wait for, or report, any subscriber.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
