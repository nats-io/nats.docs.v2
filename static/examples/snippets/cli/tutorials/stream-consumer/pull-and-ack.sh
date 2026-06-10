#!/bin/bash
# Pull the next message from the `worker` consumer and acknowledge it.
# Acknowledging advances the durable consumer so this message is never resent.
nats consumer next EVENTS worker --ack
