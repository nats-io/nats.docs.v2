#!/bin/bash
# A fetch on a drained consumer returns nothing. Using --count 1 here so
# a non-zero exit cleanly means "nothing waiting" (with --count > 1 the
# CLI can also exit non-zero after processing a partial batch). Treat an
# empty result as "nothing right now," not a failure: sleep and fetch again.
if nats consumer next ORDERS shipping --count 1 --timeout 2s; then
  echo "processed a message"
else
  echo "no orders waiting, will retry"
  sleep 1
fi
