#!/bin/bash
# The third discovery level adds the service id, addressing exactly one
# instance instead of all of them. Use it when several instances of
# OrderInventory are running and you want to inspect one in particular.
#
# Pick an id from an earlier INFO or PING reply, then target it. Replace
# the id below with one your own service printed.
INSTANCE_ID="JJTBR2MN3JSAYBI5ST7E32"

# $SRV.STATS.OrderInventory.<id> reaches only the instance with that id,
# so a single reply is expected -- no deadline loop needed for one
# instance.
nats request "\$SRV.STATS.OrderInventory.$INSTANCE_ID" '' --timeout=1s

# PING at the instance level is the lightweight check: it confirms that
# one specific instance is alive and reports its name, id, and version.
nats request "\$SRV.PING.OrderInventory.$INSTANCE_ID" '' --timeout=1s
