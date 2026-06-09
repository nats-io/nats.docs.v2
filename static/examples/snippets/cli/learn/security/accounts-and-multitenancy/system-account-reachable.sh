#!/bin/bash
# Confirm the system account is reachable once you declare a user for it.
#
# nats.conf for this example:
#
#   accounts {
#     ORDERS    { users = [ { user: "order-svc",        password: "s3cret"   } ] }
#     ANALYTICS { users = [ { user: "analytics-reader", password: "an4lytics" } ] }
#     SYS       { users = [ { user: "sys-admin",        password: "syspass"  } ] }
#   }
#   system_account: SYS
#
# Start it with: nats-server -c nats.conf

# A tenant user reaches only its own account. order-svc cannot see server events.
nats account info --user order-svc --password s3cret

# The system account user can read the server's monitoring subjects.
nats server account info SYS --user sys-admin --password syspass

# Watch live server events flowing on $SYS.SERVER.> (Ctrl-C to stop).
nats subscribe '$SYS.SERVER.>' --user sys-admin --password syspass
