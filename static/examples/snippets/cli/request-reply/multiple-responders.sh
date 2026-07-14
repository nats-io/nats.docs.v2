# Terminal 1: First service
nats reply service "Response from service 1"

# Terminal 2: Second service
nats reply service "Response from service 2"

# Terminal 3: Make request (nats reply puts both in a shared queue group,
# so one instance answers and the client gets a single reply)
nats request service ""
