#!/bin/bash
# Ask the OrderInventory service whether an order's item is in stock.
# `nats service request` looks the service up by name, resolves the
# endpoint's subject from its discovery info, sends the order payload,
# and prints the reply.
#
# The arguments are the service name, the endpoint name, and the payload.
# Underneath it is plain request-reply: a private reply subject, the
# request out on the endpoint's subject, and one answer back.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
