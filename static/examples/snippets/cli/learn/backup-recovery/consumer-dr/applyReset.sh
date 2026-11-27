#!/bin/bash

# On west, after promoting ORDERS: read the last ack floor that
# reached the mirrored bucket, and the last message on the stream.
floor=$(nats --context west kv get SYNC_CONSUMER ORDERS.shipping --raw)
last=$(nats --context west stream info ORDERS --json | jq .state.last_seq)

# Never reset past the end of the stream: if the ORDERS mirror lagged
# more than the bucket, the stored floor can be ahead of it.
if [ "$floor" -gt "$last" ]; then floor=$last; fi

# Reset the consumer to the message after the ack floor. The next
# message it delivers is floor + 1, and its ack floor becomes floor.
nats --context west req '$JS.API.CONSUMER.RESET.ORDERS.shipping' "{\"seq\": $((floor + 1))}"
