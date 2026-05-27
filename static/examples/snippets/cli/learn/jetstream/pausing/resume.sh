#!/bin/bash

# Resume a paused consumer immediately, before its deadline. Delivery
# picks up at the same cursor position the consumer held when paused.
# --force skips the confirmation prompt. Requires NATS Server 2.11+.
nats consumer resume ORDERS shipping --force
