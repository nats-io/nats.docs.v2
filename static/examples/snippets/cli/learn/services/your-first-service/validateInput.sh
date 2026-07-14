#!/bin/bash
# Pitfall demo: send a malformed body to the running OrderInventory service.
# A handler that validates its input parses req.Data() and, on failure,
# responds with a service error carrying the Nats-Service-Error and
# Nats-Service-Error-Code (400) headers instead of crashing or hanging.
#
# The default output prints the reply headers, so you can see the error
# headers the handler returned. The caller still gets a clear answer back,
# those headers tell it the request was bad, and the service stays up for
# the next caller.
nats service request OrderInventory check 'not-json'
