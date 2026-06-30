#!/bin/bash

# Pitfall: a WorkQueue stream rejects a second consumer whose subjects
# overlap an existing one. The server won't let two consumers fight over
# the same task, so it refuses the create up front.

# FULFILLMENT is the WorkQueue stream from earlier on this page. Add one
# unfiltered consumer — fine, it owns the whole queue.
nats consumer add FULFILLMENT shippers --pull --ack explicit --defaults

# Now try to add a second unfiltered consumer. The server rejects it:
#   multiple non-filtered consumers not allowed on workqueue stream
# (error 10099). The command exits non-zero.
nats consumer add FULFILLMENT eu-shippers --pull --ack explicit --defaults

# The fix is non-overlapping filters so each task belongs to exactly one
# consumer — here, one shipper consumer per region. Delete the broad
# consumer, then split by subject.
nats consumer rm FULFILLMENT shippers --force

nats consumer add FULFILLMENT us-shippers --pull --ack explicit --filter "fulfill.us" --defaults
nats consumer add FULFILLMENT eu-shippers --pull --ack explicit --filter "fulfill.eu" --defaults

# These two coexist because fulfill.us and fulfill.eu never collide.
# A wildcard like fulfill.> would overlap both and be rejected with
# "filtered consumer not unique on workqueue stream" (error 10100).
