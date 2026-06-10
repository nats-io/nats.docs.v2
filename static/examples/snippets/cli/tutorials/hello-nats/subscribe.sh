#!/bin/bash
# Subscribe to the greet subject and wait for messages.
# Each matching message prints as it arrives. Ctrl-C to stop.
nats sub greet
