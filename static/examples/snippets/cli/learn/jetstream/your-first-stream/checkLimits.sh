#!/bin/bash
# The ORDERS stream you just created has no limits. Confirm that, then
# add one so the stream cannot grow without bound.
#
# `nats stream info` reports the configured limits. With --defaults the
# three size limits print as `unlimited`, which means the stream keeps
# every message forever until the disk fills.

nats stream info ORDERS

# Set at least one limit. Here MaxAge keeps roughly seven days of
# orders; MaxBytes caps the stream at one gigabyte on disk. With the
# default Discard policy (Old), the oldest messages are dropped once a
# limit is reached, so the stream stays bounded.
#
# The full set of storage limits lives on the Shaping the stream page.
nats stream edit ORDERS \
  --max-age=7d \
  --max-bytes=1GB
