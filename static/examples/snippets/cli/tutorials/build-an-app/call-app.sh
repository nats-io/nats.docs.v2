#!/bin/bash
# Ask your running app how many orders it has seen. The app subscribes to
# app.orders.count and replies with the current total, so the request returns
# a single reply message.
nats request app.orders.count ""
