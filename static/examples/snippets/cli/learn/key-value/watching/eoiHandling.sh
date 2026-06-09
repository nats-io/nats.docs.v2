#!/bin/bash

# The end-of-initial-data signal in practice.
#
# A client watch delivers the snapshot, then ONE nil entry to mark the
# snapshot/live boundary, then live updates. A program that reads the
# watch must consume that nil entry and keep going, not treat it as the
# end of the stream. The CLI consumes it for you and keeps printing;
# the comment below shows what a client loop must do.
#
# Run the watch and confirm it does not stop after the snapshot:
nats kv watch INVENTORY

# The CLI prints the snapshot, silently steps over the nil end-of-initial
# -data entry, and keeps waiting for live changes. In client code the
# equivalent loop is:
#
#   for entry in watcher:
#       if entry is None:        # end-of-initial-data marker
#           continue             # snapshot done; keep reading live updates
#       handle(entry.key, entry.value, entry.revision)
#
# Stopping the loop on the nil entry would miss every live change. Keep
# reading.
