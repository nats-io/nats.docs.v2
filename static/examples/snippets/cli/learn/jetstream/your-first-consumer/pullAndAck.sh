#!/bin/bash
# Pull one message from the `shipping` consumer and acknowledge it.
# --ack (default) acks each received message, advancing the durable cursor.
nats consumer next ORDERS shipping --ack
