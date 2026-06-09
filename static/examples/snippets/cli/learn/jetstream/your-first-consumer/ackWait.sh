#!/bin/bash
# Set Ack Wait to match how long processing actually takes.
# --wait 30s gives a reader 30 seconds to ack before the server redelivers.
# Set it longer than your slowest message handler, not shorter.
nats consumer add ORDERS shipping --pull --ack explicit --wait 30s --defaults
