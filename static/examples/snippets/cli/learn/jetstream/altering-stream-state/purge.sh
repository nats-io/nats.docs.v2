#!/bin/bash
# Clear every message from ORDERS. The stream itself stays — same config, same
# consumers, same name — only the messages go. It asks for confirmation first;
# add --force to skip the prompt in a script.
nats stream purge ORDERS
