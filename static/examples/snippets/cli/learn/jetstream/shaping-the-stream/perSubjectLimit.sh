#!/bin/bash
# Add a per-subject ceiling to ORDERS so one noisy subject cannot evict
# another subject's messages.
#
# MaxMsgs, MaxBytes, and MaxAge all measure the stream as a whole,
# across every subject under orders.>. If orders.created floods in, its
# messages count toward the same ceiling as orders.shipped, and Discard
# Old can drop a shipped order to make room for a created one.
#
# --max-msgs-per-subject sets MaxMsgsPerSubject: a separate ceiling
# applied to each individual subject. Set it to 100000 and every subject
# keeps its own most-recent 100000 messages, independent of how loud its
# neighbors are.

nats stream edit ORDERS --max-msgs-per-subject=100000

# Read the stream back; the per-subject limit now appears alongside the
# whole-stream limits.
nats stream info ORDERS
