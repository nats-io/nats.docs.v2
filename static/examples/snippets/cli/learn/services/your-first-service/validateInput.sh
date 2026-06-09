#!/bin/bash
# Pitfall demo: send a malformed body to the OrderInventory service.
# A handler that validates its input parses req.Data() and, on failure,
# responds with a service error carrying Nats-Service-Error and
# Nats-Service-Error-Code (400) instead of crashing.
#
# `--raw` prints only the reply body; pass `-H` style headers off the
# reply with `nats service request` to inspect Nats-Service-Error-Code.
# The point: a bad request gets a clear error back, not a hang, and the
# service stays up for the next caller.
nats service request OrderInventory check 'not-json' --raw
