#!/bin/bash

# On west: lift the pause (-f skips the confirmation prompt, which
# fails in a script). The shipping consumer starts delivering
# from the position set by the reset.
nats --context west consumer resume ORDERS shipping -f

# Check the position: the ack floor is the value from the bucket.
nats --context west consumer info ORDERS shipping
