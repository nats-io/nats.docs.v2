#!/bin/bash
# Point nats-server at a nats-based account resolver, start it, then push the
# ACME accounts so the server can validate users in ORDERS and ANALYTICS.

# Generate the server config for a full nats-based resolver.
# It embeds the operator JWT and system account, and a resolver { type: full } block.
nsc generate config --nats-resolver > resolver.conf

# Start the server with that config. The ./jwt directory starts empty.
nats-server -c resolver.conf &

# Tell nsc the server's NATS URL so it knows where to deliver account JWTs.
nsc edit operator --account-jwt-server-url nats://localhost:4222

# Push every account JWT under ACME to the running server.
# User JWTs are NOT pushed -- clients present their own at connect time.
nsc push --all
