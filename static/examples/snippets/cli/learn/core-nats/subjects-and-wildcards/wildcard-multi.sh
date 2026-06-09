#!/bin/bash

# Audit service: catch every order message at any depth. The multi-token
# wildcard > matches one or more tokens and must be the last token, so
# orders.> matches orders.created, orders.us.created, and
# orders.us.west.created alike.
nats sub "orders.>"
