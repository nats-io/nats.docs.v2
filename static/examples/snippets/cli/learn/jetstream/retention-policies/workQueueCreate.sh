#!/bin/bash

# A WorkQueue stream, for contrast. Leave ORDERS alone — this is a
# separate JOBS stream that exists only to show the retention difference.

# --retention work sets the WorkQueue policy. natscli accepts "work" and
# "workq" as aliases; both map to the WorkQueue retention policy. Under
# WorkQueue a message is removed the moment the first consumer acks it.
nats stream add JOBS \
  --subjects "jobs.>" \
  --retention work \
  --defaults

# Inspect it — the configuration block now reads Retention Policy:
# WorkQueue, where ORDERS reads Limits.
nats stream info JOBS

# Publish one job, then pull and ack it from a consumer. After the ack
# the message is gone — the stream's message count drops back to zero,
# which no limit on a Limits stream like ORDERS would ever do.
nats pub jobs.pack '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats consumer add JOBS packer --pull --ack explicit --defaults
nats consumer next JOBS packer --count 1 --ack

# Confirm the ack removed the message: Messages is back to 0.
nats stream info JOBS
