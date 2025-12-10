#!/bin/bash

# Terminal 1: Audit logger (sees all messages)
nats sub "orders.>"

# Terminal 2: Worker 1 in queue group
nats sub "orders.new" --queue workers

# Terminal 3: Worker 2 in queue group
nats sub "orders.new" --queue workers

# Terminal 4: Publish messages
nats pub orders.new "Order 123"
# Audit logger sees it
# One worker processes it
