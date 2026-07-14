#!/bin/bash
# Create the ORDERS stream that captures every order event your app
# publishes. The stream stores every message on subjects under orders.>
# so nothing is lost between runs.
nats stream add ORDERS \
  --subjects "orders.>" \
  --storage file \
  --defaults
