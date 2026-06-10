#!/bin/bash
# Watch the whole profiles bucket. On start it replays the current value
# of every key, then blocks and prints each change live until you stop it
# with Ctrl-C. Run this in its own terminal.

nats kv watch profiles

# You should see the current value first, then it waits:
#
#   [2026-06-09 10:14:22] PUT profiles > sue.color: blue
