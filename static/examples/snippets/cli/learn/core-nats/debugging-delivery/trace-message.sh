#!/bin/bash

# Trace the path of one message to a subject. Requires NATS Server 2.11 or
# newer. nats trace publishes a special traced message and prints every hop it
# takes and every subscriber it matches, including why it matched.
#
# Without --deliver the traced message is NOT handed to matching subscribers:
# the trace reports who WOULD receive it without actually delivering it. It's a
# probe, not a real publish, so it never triggers your subscribers' side effects.
nats trace orders.us.created

# Add --deliver to also deliver the traced message to matching subscribers,
# turning the probe into a real publish that they receive.
nats trace orders.us.created --deliver
