# Terminal 1: Service instance 1
nats reply api.calculate --queue api-workers "Result from instance 1"

# Terminal 2: Service instance 2
nats reply api.calculate --queue api-workers "Result from instance 2"

# Terminal 3: Service instance 3
nats reply api.calculate --queue api-workers "Result from instance 3"

# Terminal 4: Make requests (load balanced across instances)
nats request api.calculate ""
nats request api.calculate ""
nats request api.calculate ""
