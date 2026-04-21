#!/bin/bash

# Application components publish logs
nats pub logs.error "Database connection failed"
nats pub logs.info "Service started successfully"
nats pub logs.debug "Processing request ID: 12345"

# Centralized logger subscribes to all log levels
nats sub 'logs.>'
