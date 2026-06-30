#!/bin/bash

# Read directly from the stream's store with the Direct Get API. --direct
# routes the read to any server holding a copy of the stream, not just the
# leader, and returns a batch in one request:
#   --start-sequence 1  begin at sequence 1
#   --count 3           return three messages, then stop
# Each message carries a Nats-Num-Pending header counting down to 0 on the
# last one, so the client knows when the batch is complete.
nats sub --stream ORDERS --direct --start-sequence 1 --count 3
