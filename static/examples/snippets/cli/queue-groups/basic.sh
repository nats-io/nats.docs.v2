# Terminal 1: First worker in queue group
nats sub orders.new --queue workers

# Terminal 2: Second worker in same queue group
nats sub orders.new --queue workers

# Terminal 3: Third worker in same queue group
nats sub orders.new --queue workers

# Terminal 4: Publish messages (distributed across workers)
nats pub orders.new "Order 1"
nats pub orders.new "Order 2"
nats pub orders.new "Order 3"
nats pub orders.new "Order 4"

# Each message goes to exactly one worker
