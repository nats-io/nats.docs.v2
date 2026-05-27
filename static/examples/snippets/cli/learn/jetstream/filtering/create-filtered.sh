#!/bin/bash

# Create the analytics consumer filtered to orders.shipped only.
nats consumer add ORDERS analytics --filter "orders.shipped" --pull
