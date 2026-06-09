#!/bin/bash
# Build the ACME trust chain with nsc: operator -> accounts -> user -> creds.
# Run once on a trusted machine. nsc generates the nkeys and signs every JWT.

# Create the operator ACME and a system account under it.
# The system account (--sys) is required by the nats-based resolver later.
nsc add operator --name ACME --sys

# Create the two tenant accounts, each signed by ACME.
nsc add account --name ORDERS
nsc add account --name ANALYTICS

# Create the order-svc user inside ORDERS, signed by the ORDERS account.
nsc add user --name order-svc --account ORDERS

# Inspect what was built. The issuer field is the operator key that signed it.
nsc describe account --account ORDERS

# Package the user JWT plus its private nkey seed into a creds file.
# This file is a secret: it contains a private key.
nsc generate creds --account ORDERS --name order-svc --output-file order-svc.creds
