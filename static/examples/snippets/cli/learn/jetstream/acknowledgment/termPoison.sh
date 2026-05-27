#!/bin/bash
# This message can never be processed (a poison message: malformed
# payload, a validation that will never pass). Terminate it so the
# server drops it from the pending list and never redelivers it,
# regardless of how many delivery attempts remain.

# Pull the next message and term it.
nats consumer next ORDERS shipping --term
