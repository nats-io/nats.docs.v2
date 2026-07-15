#!/bin/bash

# Direct Get can return a batch of messages over a single request. Ask for three
# starting at sequence 1; the server streams them back without a round trip
# each, every message carrying a Nats-Num-Pending header that counts down to 0
# on the last one.
nats sub --stream ORDERS --direct --start-sequence 1 --count 3
