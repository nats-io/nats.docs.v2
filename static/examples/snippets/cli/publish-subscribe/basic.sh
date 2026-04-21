# Terminal 1: Start first subscriber
nats sub events.data

# Terminal 2: Start second subscriber
nats sub events.data

# Terminal 3: Start third subscriber
nats sub events.data

# Terminal 4: Publish a message
nats pub events.data "Hello from NATS!"

# All three subscribers receive the message
