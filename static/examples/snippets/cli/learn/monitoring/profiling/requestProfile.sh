#!/bin/bash
# Ask every server in the system for a heap profile.
# The request travels on $SYS.REQ.SERVER.PING.PROFILEZ, so the context
# must be connected to the system account.
nats server request profile heap

# Write the files somewhere other than the working directory.
# The directory has to exist already.
mkdir -p ./profiles
nats server request profile heap ./profiles
