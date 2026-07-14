#!/bin/bash

# Direct Get's batch form returns many messages from one request: set `batch`
# in the request and the server streams them back, then closes with an EOB
# marker. The client examples use it that way. This CLI reads the same range but
# pages through it one message per request. Every message carries a
# Nats-Num-Pending header: how many still match in the stream after it.
nats sub --stream ORDERS --direct --start-sequence 1 --count 3
