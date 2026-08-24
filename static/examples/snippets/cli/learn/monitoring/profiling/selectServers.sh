#!/bin/bash
# Profile one node instead of the whole system.
nats server request profile heap --name=n1-east

# Profile every node in the east cluster.
nats server request profile heap --cluster=east

# Profile every node carrying a configured tag.
nats server request profile heap --tags=aws
