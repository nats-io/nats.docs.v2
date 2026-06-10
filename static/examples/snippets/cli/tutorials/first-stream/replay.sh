#!/bin/bash

# Replay every message stored in the stream, oldest first.
#   --all              start at the first stored message (sequence 1)
#   --terminate-at-end stop once all stored messages have been read
nats sub "events.>" --all --terminate-at-end
