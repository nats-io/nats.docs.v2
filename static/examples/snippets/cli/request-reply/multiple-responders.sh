# Terminal 1: First service
nats reply service 'echo "Response from service 1"'

# Terminal 2: Second service
nats reply service 'echo "Response from service 2"'

# Terminal 3: Make request (receives one random response)
nats request service ""
