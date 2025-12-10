#!/bin/bash

# Send request with headers
nats request service "data" -H "X-Request-ID:123" -H "X-Priority:high"
