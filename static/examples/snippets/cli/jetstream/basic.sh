# Create a stream that captures any subject under `orders.`
nats stream add ORDERS --subjects "orders.>" --storage file --retention limits --defaults

# Publish a few orders
nats pub orders.new "Order #1001"
nats pub orders.new "Order #1002"
nats pub orders.shipped "Order #1001 shipped"

# Create a durable pull consumer that delivers from the beginning of the stream
nats consumer add ORDERS order-processor --pull --deliver all --ack explicit --defaults

# Fetch and acknowledge the next batch of messages
nats consumer next ORDERS order-processor --count 3 --ack
