#!/bin/bash

# Terminal 1: Calculator service
nats reply calc.add '
  read input
  echo "$input" | awk "{print \$1 + \$2}"
'

# Terminal 2: Make calculations
echo "5 3" | nats request calc.add -
echo "10 7" | nats request calc.add -
