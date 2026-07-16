#!/bin/sh
# Build the ACME trust chain: operator -> accounts -> users -> creds.
# Run once on a trusted machine. nats auth generates the nkeys and
# signs every JWT with the correct key in the chain.

# Create the operator ACME. A SYSTEM account and one operator signing
# key are created automatically; the resolver needs SYSTEM later.
nats auth operator add ACME
# Operator ACME (OBZITYNM2EAIJ4G5PZTH3XIRUIEIZH63YSFO2JKPNGWVFBGKBPEJP5WS)
#   System Account: SYSTEM (ADAHVYCRL72B3US4VANPUIQXCNHFCQWFOCPOG7YDPPX36Z3DCJTHZP46)

# Create the two tenant accounts, each signed by ACME.
# --defaults skips the interactive limit prompts.
nats auth account add ORDERS --defaults
# Account ORDERS (AC6S25M37MU5PJGKYF5QPJPJ6XDQZXJPIPTMCR5MK7ZALYQGX6MH4IRU)
nats auth account add ANALYTICS --defaults
# Account ANALYTICS (AALQ2LGPK55V7AOZWO6ODKFFX7HI6QHJ2MNYKZ6FFNAVZJB2J2WB4UFD)

# Create one user per account and write its creds file in the same step.
nats auth user add order-svc ORDERS --defaults --credential order-svc.creds
# User order-svc (UAKAFPCC4KDEKCAKP47VXHEYGHSL4GDET65EE7LMHMD2PCRAAWP37U2B)
nats auth user add analytics-reader ANALYTICS --defaults --credential analytics-reader.creds

# Inspect what was built. The issuer is the operator key that signed it.
nats auth account info ORDERS
