#!/bin/bash

# Get one stored message by its sequence number — the number the PubAck
# returned when the message was published. No consumer, no ack, no cursor:
# the server reads the message straight from the stream's store and returns it.
nats stream get ORDERS 2
