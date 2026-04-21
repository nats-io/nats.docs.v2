#!/bin/bash

# Event Publisher
nats pub user.login '{"userId":"123","timestamp":1234567890}'

# Event Subscriber (in another terminal)
nats sub user.login
