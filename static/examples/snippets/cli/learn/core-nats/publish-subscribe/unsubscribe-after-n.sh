#!/bin/bash
# Subscribe to orders.created and stop automatically after three messages.
# --count makes nats sub quit once it has received that many, giving a
# take-exactly-N read instead of an open-ended subscription you Ctrl-C.
nats sub orders.created --count 3
