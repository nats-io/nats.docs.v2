#!/bin/bash
# Sample n1-east's CPU for the default five seconds.
nats server request profile cpu --name=n1-east

# --timeout doubles as the sampling window for cpu profiles.
# The server rejects a window longer than 15 seconds.
nats server request profile cpu --name=n1-east --timeout=10s
