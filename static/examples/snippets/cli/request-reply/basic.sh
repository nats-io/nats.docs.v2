# Terminal 1: Set up a service that responds to time requests
nats reply time --command "date"

# Terminal 2: Make a request
nats request time ""

# Output: Wed Nov 15 10:23:45 PST 2023
