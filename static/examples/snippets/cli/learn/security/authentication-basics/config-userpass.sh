#!/bin/bash
# Start a nats-server using centralized (config-based) authentication.
#
# nats.conf holds the ORDERS and ANALYTICS accounts, each with its own
# `users` array of user/password credentials (see the page for the file).
# The server reads the full user list from this one file on startup.
#
# Generate a bcrypt hash for a password before pasting it into the config
# (the server warns on plaintext passwords). `--generate` invents a strong
# passphrase and hashes it in one step:
nats server passwd --generate

# Then launch the server against the config. -c points at the config file.
nats-server -c nats.conf
