#!/bin/bash

# Inspect the bucket as the stream it really is.
#
# The INVENTORY bucket is a JetStream stream named KV_INVENTORY. The KV
# commands hide that name, but the stream commands see straight through to
# it. Ask the server for the stream that backs the bucket:
nats stream info KV_INVENTORY

# The configuration half proves every framing claim from this chapter:
#
#   Subjects: $KV.INVENTORY.>          # one subject per key
#   Discard Policy: New                # at a limit, rejects the newest write
#   Direct Get: true                   # get reads without a consumer
#   Allows Rollups: true               # purge replaces a key with one marker
#   Allows Msg Delete: false           # deny_delete: no raw stream deletes
#   Maximum Per Subject: 10            # this is the history depth (raised on
#                                      # the history page)
#
# The key widget-blue is the last token of its subject. Confirm it by
# asking the stream for the last message on that exact subject:
nats stream subjects KV_INVENTORY

# Expected output lists $KV.INVENTORY.widget-blue (and one subject per
# other key). The value 42 you put on page 1 is the body of the last
# message on $KV.INVENTORY.widget-blue.
