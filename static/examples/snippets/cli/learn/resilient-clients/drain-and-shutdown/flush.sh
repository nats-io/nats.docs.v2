#!/bin/bash
# Flush is a client-library call: a PING the server answers with a PONG,
# confirming the server received everything the client wrote before it.
# The CLI has no flush command; the closest observable is `nats rtt`,
# the same PING/PONG round trip reported as a duration.
#
# For each server it can reach, `nats rtt` runs five round trips and
# prints the averaged time per resolved address.

nats rtt --server nats://n1:4222,nats://n2:4222,nats://n3:4222
