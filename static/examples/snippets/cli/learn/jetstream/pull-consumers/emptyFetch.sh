#!/bin/bash
# A fetch on a drained consumer returns nothing. nats consumer next exits
# non-zero when the pull times out with no messages waiting. Treat that as
# "nothing right now," not a failure: sleep and fetch again.
if nats consumer next ORDERS shipping --count 10 --timeout 2s; then
  echo "processed a batch"
else
  echo "no orders waiting, will retry"
  sleep 1
fi
