# Terminal 1: Set up a service that responds to time requests
nats reply time 'echo "The time is $(date)"'

# Terminal 2: Make a request
nats request time ""

# Output: The time is Wed Nov 15 10:23:45 PST 2023
