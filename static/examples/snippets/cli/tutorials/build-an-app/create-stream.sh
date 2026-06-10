#!/bin/bash
# Create the EVENTS stream that captures every order event your app
# publishes. The stream stores every message on subjects under orders.>
# so nothing is lost between runs.
nats stream add EVENTS \
  --subjects "orders.>" \
  --storage file \
  --defaults
