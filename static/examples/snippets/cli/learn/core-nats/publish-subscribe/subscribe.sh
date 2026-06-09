#!/bin/bash
# Subscribe as the warehouse service to orders.created. Each matching
# message is printed as it arrives; Ctrl-C to stop. To receive every
# order subject at once instead, subscribe to the wildcard orders.>
nats sub orders.created
