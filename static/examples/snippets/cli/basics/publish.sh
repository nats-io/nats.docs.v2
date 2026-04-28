#!/bin/bash

# Publish a message to the "weather.updates" subject
nats pub weather.updates "Temperature: 72°F"
