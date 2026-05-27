#!/bin/bash
# A single fetch from the CLI. --count sets the batch size: ask for up
# to 5 messages. Run this again to walk the stream a batch at a time.
nats consumer next ORDERS shipping --count 5
