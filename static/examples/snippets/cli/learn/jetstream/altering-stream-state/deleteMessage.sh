#!/bin/bash
# Remove one stored message by its sequence number. `nats stream rmm` securely
# erases it: the server overwrites the stored bytes so the old contents can't
# be read back. It asks for confirmation first; add --force to skip the prompt.
nats stream rmm ORDERS 2
