#!/bin/bash
# Publish six messages to the "tasks" subject. The --count flag sends the
# publish that many times, and {{ Count }} is replaced with the message
# number (1, 2, 3, ...). With two workers in the "workers" queue group,
# the server hands each message to exactly one of them.
nats pub tasks "task {{ Count }}" --count 6
