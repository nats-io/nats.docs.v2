#!/bin/bash

# Terminal 1: Calculator service (adds the two numbers in the request body)
nats reply calc.add --command "sh -c \"echo \$NATS_REQUEST_BODY | awk '{print \$1 + \$2}'\""

# Terminal 2: Make calculations
nats request calc.add "5 3"
# Output: 8
nats request calc.add "10 7"
# Output: 17
