#!/bin/bash
# Create a durable pull consumer named `shipping` on the ORDERS stream.
# --pull: reader fetches messages on demand (pull consumer)
# --ack explicit: every delivered message must be individually acknowledged
nats consumer add ORDERS shipping --pull --ack explicit --defaults
