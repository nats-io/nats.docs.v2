#!/bin/bash
# Add a durable pull consumer named `worker` to the EVENTS stream.
# --pull: the reader fetches messages on demand (a pull consumer)
# --ack explicit: every delivered message must be individually acknowledged
# --defaults: accept the default values for everything else
nats consumer add EVENTS worker --pull --ack explicit --defaults
