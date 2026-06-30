#!/bin/bash

# Pitfall: a WorkQueue stream rejects a second consumer whose subjects
# overlap an existing one. The server will not let two consumers fight
# over the same message, so it refuses the create up front.

# JOBS is the WorkQueue stream from earlier on this page. Add one
# unfiltered consumer — fine, it owns the whole stream.
nats consumer add JOBS packer --pull --ack explicit --defaults

# Now try to add a second unfiltered consumer. The server rejects it:
#   multiple non-filtered consumers not allowed on workqueue stream
# (error 10099). The command exits non-zero.
nats consumer add JOBS shipper --pull --ack explicit --defaults

# The fix is non-overlapping filters so each message belongs to exactly
# one consumer. Delete the broad consumer, then split by subject.
nats consumer rm JOBS packer --force

nats consumer add JOBS packer  --pull --ack explicit --filter "jobs.pack"  --defaults
nats consumer add JOBS shipper --pull --ack explicit --filter "jobs.ship"  --defaults

# These two coexist because jobs.pack and jobs.ship never collide.
# A wildcard like jobs.> would overlap both and be rejected with
# "filtered consumer not unique on workqueue stream" (error 10100).
