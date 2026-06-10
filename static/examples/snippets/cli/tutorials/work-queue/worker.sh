#!/bin/bash
# Subscribe to the "tasks" subject as a member of the "workers" queue group.
# The --queue flag names the group. Every subscriber that names the same
# group on the same subject shares the load: each message is delivered to
# exactly one member. Run this in two terminals to watch work split between
# them. Press Ctrl-C to stop.
nats sub tasks --queue workers
