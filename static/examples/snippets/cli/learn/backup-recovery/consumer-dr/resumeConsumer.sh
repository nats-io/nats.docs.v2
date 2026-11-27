#!/bin/bash

# On west: lift the pause. The shipping consumer starts delivering
# from the position set by the reset.
nats --context west consumer resume ORDERS shipping

# Check the position: the ack floor is the value from the bucket.
nats --context west consumer info ORDERS shipping
