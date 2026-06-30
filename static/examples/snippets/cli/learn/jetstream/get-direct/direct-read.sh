#!/bin/bash

# Read directly from the stream's store with the Direct Get API. --direct
# routes the read to any server holding a copy of the stream, not just the
# leader. This fetches the message at sequence 1 from whichever replica
# answers, marked "(direct)" to show it came over the Direct Get API.
nats sub --stream ORDERS --direct --start-sequence 1 --count 1
