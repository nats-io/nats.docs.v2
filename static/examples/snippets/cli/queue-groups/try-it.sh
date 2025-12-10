#!/bin/bash

# Terminal 1: Start first worker
nats sub tasks.process --queue workers

# Terminal 2: Start second worker
nats sub tasks.process --queue workers

# Terminal 3: Send tasks
for i in {1..10}; do
  nats pub tasks.process "Task $i"
  sleep 0.5
done

# Watch tasks distributed between workers
