#!/bin/bash
# Cap the ORDERS stream so it cannot grow without bound.
#
# `nats stream edit` changes an existing stream in place. The three
# messages already stored stay where they are; only the configuration
# changes. The command prints a diff of what will change and asks for
# confirmation before applying it.
#
# --max-age sets MaxAge: the oldest a message may get. 7d means a
#   message is removed roughly seven days after it was stored.
# --max-bytes sets MaxBytes: the most disk the stream may occupy on
#   disk. 1GiB caps it at one gibibyte (about a gigabyte); the stream
#   never grows past it. nats reports the cap back as "1.0 GiB".
#
# MaxMsgs is left unset, so message count stays unlimited. Discard
# policy is left at its default (Old), so when a limit is hit the
# server drops the oldest messages to make room.

nats stream edit ORDERS \
  --max-age=7d \
  --max-bytes=1GiB
