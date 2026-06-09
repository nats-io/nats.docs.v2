#!/bin/bash
# A message that hits MaxDeliver leaves the consumer with no dead-letter
# queue. It is not lost from the stream, but the shipping consumer stops
# delivering it -- and nothing in the consumer's normal output says so.
#
# The drop is observable: the server publishes an advisory the moment a
# message exceeds its delivery limit. Watch for it so a poison message
# does not vanish unnoticed.

# Subscribe to the max-deliveries advisory for the shipping consumer.
# The server publishes here when a message (e.g. order ord_8w2k) is
# delivered MaxDeliver times without a final ack.
nats sub '$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.shipping'

# Or watch every JetStream advisory in one stream, including this one:
#   nats events --js-advisory --no-srv-advisory
