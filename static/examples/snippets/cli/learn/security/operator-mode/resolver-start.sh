#!/bin/sh
# Start the server with the generated resolver config, then push the
# ACME accounts so it can validate users in ORDERS and ANALYTICS.

# nats server generate is interactive: pick the template
# "'nats auth' managed NATS Server configuration" and answer the
# prompts. It writes ./acme-server/server.conf.
nats server generate ./acme-server

# Start the server. Its resolver directory begins empty.
# Leave it running; the commands below go in a second terminal.
nats-server -c ./acme-server/server.conf

# Create a SYSTEM user. Its creds are what authorizes a push.
nats auth user add admin SYSTEM --defaults --credential sys.creds

# Push each account JWT to the running server. Push is per account.
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
# Updating account ORDERS (AC6S25M37MU5PJGKYF5QPJPJ6XDQZXJPIPTMCR5MK7ZALYQGX6MH4IRU) on 1 server(s)
# ✓ Update completed on acme-1
# Success 1 Failed 0 Expected 1
nats auth account push ANALYTICS -s nats://127.0.0.1:4222 --creds sys.creds
# Success 1 Failed 0 Expected 1
