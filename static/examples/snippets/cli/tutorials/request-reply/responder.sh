#!/bin/bash
# Start a responder on the subject "time". `nats reply` subscribes to the
# subject and, for every request it receives, runs the command and sends its
# output back on the request's private reply subject. Leave this running.
nats reply time --command "date"
