#!/bin/bash

# Request to a subject with no subscribers
nats request no.such.service "test"

# Error: no responders available for request
