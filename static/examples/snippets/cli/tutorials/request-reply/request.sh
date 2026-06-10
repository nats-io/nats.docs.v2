#!/bin/bash
# Call the responder once. `nats request` creates a private inbox, subscribes
# to it, publishes an (empty) request on "time" with the inbox attached, and
# prints the first reply it gets back. --timeout is the longest it waits.
nats request time "" --timeout 2s
