#!/bin/bash

# Create a stream named EVENTS that captures every subject under events.>
# --defaults fills in sensible starting values so the CLI does not prompt.
nats stream add EVENTS --subjects "events.>" --defaults
