#!/bin/bash
# Subscribe to every JetStream advisory the cluster publishes.
# Advisories are transient: you only see events that fire while you are
# attached. Leave this running before the shipping consumer goes wrong.
nats subscribe '$JS.EVENT.ADVISORY.>'

# When a poison order exhausts its deliveries on the shipping consumer,
# one max_deliver advisory lands on this subject:
#   $JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.shipping
# The message body names the stream, the consumer, the failed sequence,
# and how many times delivery was attempted:
#
# {
#   "type": "io.nats.jetstream.advisory.v1.max_deliver",
#   "stream": "ORDERS",
#   "consumer": "shipping",
#   "stream_seq": 987,
#   "deliveries": 5
# }
