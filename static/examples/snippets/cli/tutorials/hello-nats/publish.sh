#!/bin/bash
# Publish one message to the greet subject. The publish is
# fire-and-forget: it hands the message to the server and exits.
nats pub greet "Hello NATS!"
