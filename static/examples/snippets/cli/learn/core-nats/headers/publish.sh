#!/bin/bash
# Publish an orders.created message with two headers attached. -H (or
# --header) takes a Key:Value pair; repeat it to add more than one header.
# The headers travel alongside the JSON body, they are not part of it.
#
#   Content-Type     tells receivers how to read the body
#   Acme-Request-Id  a value your own code sets, here the upstream request
#                    that produced this order
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  -H 'Content-Type:application/json' \
  -H 'Acme-Request-Id:req_7f3c9a'
