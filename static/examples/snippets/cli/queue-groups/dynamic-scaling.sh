# Start with one worker
nats sub tasks --queue workers

# Load increases - add more workers (in new terminals)
nats sub tasks --queue workers
nats sub tasks --queue workers

# Load decreases - stop workers with Ctrl+C
# Remaining workers automatically take over
