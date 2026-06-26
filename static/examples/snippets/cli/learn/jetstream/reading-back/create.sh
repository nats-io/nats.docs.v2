#!/bin/bash

# Create a named, durable consumer on the ORDERS stream.
# A durable consumer has a name you choose. The server keeps its position on
# disk under that name, so a reader resumes where it left off after a
# disconnect or a server restart instead of starting over.
#   --deliver all   start at the first message in the stream (sequence 1)
#   --pull          the reader asks for messages when it's ready
#   --ack explicit  acknowledge each message; the position advances only once
#                   a message is acked (the default for a pull consumer)
nats consumer add ORDERS billing \
  --deliver all \
  --pull \
  --ack explicit \
  --defaults
