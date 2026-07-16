#!/bin/bash
# Carry a trace id through a request and watch it come back on the reply.
#
# Terminal 1 - an echo responder on orders.inventory.check. --echo reflects
# each request straight back and copies its headers onto the reply, so the
# trace id you send returns to you. A real inventory service would instead
# copy just the trace id onto its own {"in_stock":...} answer.
#   nats reply orders.inventory.check --echo
#
# Terminal 2 - send the check with a trace id and a request id attached.
# nats request prints the reply's headers, so you will see Acme-Trace-Id come
# back (alongside a NATS-Reply-Counter the echo responder adds).
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  -H 'Acme-Trace-Id:trace_5e21' \
  -H 'Acme-Request-Id:req_7f3c9a' \
  --timeout 2s
