# Subscribe to all weather updates
nats sub "weather.>"

# These all match the subscription
nats pub weather.us "US weather update"
nats pub weather.us.east "East coast update"
nats pub weather.eu.north.finland "Finland weather"
