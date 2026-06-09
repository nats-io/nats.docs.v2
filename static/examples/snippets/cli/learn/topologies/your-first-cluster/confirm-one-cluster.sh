#!/bin/bash
# Confirm the three east servers joined ONE cluster, not several.
# A mismatched cluster name does not error loudly — it silently
# forms a separate cluster, so you check the Cluster column.

# List every server the system account can see, with its cluster.
nats server list --user east-overview

# Expected: three rows, every Cluster column reading "east".
#
# ╭──────────┬─────────┬──────────┬───────┬──────╮
# │ Name     │ Cluster │ Version  │ Conns │ Subs │
# ├──────────┼─────────┼──────────┼───────┼──────┤
# │ n1-east  │ east    │ 2.x.x    │     1 │    9 │
# │ n2-east  │ east    │ 2.x.x    │     0 │    9 │
# │ n3-east  │ east    │ 2.x.x    │     0 │    9 │
# ╰──────────┴─────────┴──────────┴───────┴──────╯
#
# Trouble sign: a server shows a different Cluster name (a typo like
# "east1"), or fewer than three rows appear. That server formed its
# own cluster and is not part of east.

# Cross-check the route count: each server should hold a route to the
# other two. With three servers in one cluster, Rts reads 2 everywhere.
nats server report --user east-overview
