# Subscribe using single token wildcard
nats sub "weather.*.east"

# Publish to specific subjects
nats pub weather.us.east "Temperature: 72F"
nats pub weather.eu.east "Temperature: 18C"
