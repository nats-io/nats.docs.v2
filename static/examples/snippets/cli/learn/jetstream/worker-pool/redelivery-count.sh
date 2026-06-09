#!/bin/bash
# Redelivery means a worker can see the same order more than once: a
# crashed worker's in-flight message comes back after AckWait. Keep
# processing idempotent so shipping ord_8w2k twice is harmless.

# Whole-pool view of redelivery. Look for "Redelivered Messages".
# A climbing count is normal under churn; a large jump means a batch of
# workers died and their in-flight work came back to surviving workers.
nats consumer info ORDERS shipping

# Pull one order WITHOUT acking so you can inspect it first.
# If your worker keys side effects by order_id, a second delivery of
# ord_8w2k is a no-op instead of a double shipment.
nats consumer next ORDERS shipping --count 1 --no-ack
