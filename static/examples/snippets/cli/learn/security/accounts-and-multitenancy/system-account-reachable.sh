#!/bin/sh
# Confirm the system account is reachable once you declare a user for it.
#
# nats.conf for this example adds a SYS account to the page's config:
#
#   accounts {
#     ORDERS:    { ... unchanged from the page ... }
#     ANALYTICS: { users: [ { user: analytics-reader, password: an4lytics } ] }
#     SYS:       { users: [ { user: sys-admin, password: syspass } ] }
#   }
#   system_account: SYS
#
# Start it with: nats-server -c nats.conf

# A tenant user reaches only its own account.
nats account info --user analytics-reader --password an4lytics
# Expected (among other lines):
#   Account: ANALYTICS (ANALYTICS)
#   System Account: false

# The system-account user can query any account on the server.
nats server account info SYS --user sys-admin --password syspass
# Expected (among other lines):
#   System Account: true

# Watch live server events flowing on $SYS.SERVER.> (Ctrl-C to stop).
nats subscribe '$SYS.SERVER.>' --user sys-admin --password syspass
# Expected: advisories such as $SYS.SERVER.ACCOUNT.ANALYTICS.CONNS
# as clients connect and disconnect.
