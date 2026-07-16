#!/bin/bash
# The server sends first. The moment a TCP client connects to port 4222, the
# server sends an INFO line -- plain text, ending in CRLF -- describing itself
# and the limits it enforces. Any raw TCP tool shows it; here we use nc against
# the running nats-server. Ctrl-C to quit.
nc localhost 4222

# The server immediately prints a line like:
#
#   INFO {"server_id":"ND2X...","version":"2.14.0","proto":1,"headers":true,"max_payload":1048576,...}
#
# headers:true means the server supports message headers, and max_payload
# (1048576 bytes, 1 MB) is the largest message it will accept. A real client
# reads this INFO, then replies with its own CONNECT line declaring its name
# and the features it wants -- the exchange your client library runs for you.
