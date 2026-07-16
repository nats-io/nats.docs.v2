#!/bin/sh
# Eavesdrop demo: what actually crosses $SYS.REQ.USER.AUTH. The server's
# automatic deny stops other users from PUBLISHING a fake request or
# verdict, but it does not hide the request from anything that can read
# the subject. The auth service — and anything sharing its account — sees
# every connection attempt in the clear. That is why ADR-26 says isolate
# the account and reach for xkey.

# 1. The page's callout config. auth-svc is the auth_users bypass user, so
#    it is the one client allowed to connect without a callout and read the
#    subject. auth-callout.conf:
#
#    accounts {
#        ORDERS: {}
#        ANALYTICS: {}
#    }
#    authorization {
#        users: [ { user: auth-svc, password: c4llout } ]
#        auth_callout {
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            auth_users: [ auth-svc ]
#        }
#    }

# 2. Start the server with that config.
nats-server -c auth-callout.conf &

# 3. Terminal one: the bypass user subscribes to the hand-off subject. No
#    auth service is answering — we only want to read what the server
#    publishes there, not reply to it.
nats --server nats://localhost:4222 \
  --user auth-svc --password c4llout \
  sub '$SYS.REQ.USER.AUTH' --count 1

# 4. Terminal two: a second client connects with a test credential. The
#    server can't authenticate it locally, so it publishes an authorization
#    request to $SYS.REQ.USER.AUTH — which terminal one receives.
nats --server nats://localhost:4222 \
  --token "test-cred-xyz" \
  pub orders.created 'hi'

# Terminal one prints the request: a base64url JWT.
# [#1] Received on "$SYS.REQ.USER.AUTH" with reply "$SYS._INBOX...."
# eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ.eyJhdWQiOiJuYXRz...

# 5. base64 is encoding, not encryption. Decode the middle segment — the
#    claims — and the plaintext falls straight out. tr fixes base64url
#    characters; the loop pads to a multiple of four so base64 -d does not
#    truncate.
P="$(nats --server nats://localhost:4222 \
  --user auth-svc --password c4llout \
  sub '$SYS.REQ.USER.AUTH' --count 1 --raw | cut -d. -f2 | tr '_-' '/+')"
while [ $(( ${#P} % 4 )) -ne 0 ]; do P="${P}="; done
printf '%s' "$P" | base64 -d
# (run the terminal-two publish again to trigger a fresh request)

# Expected (trimmed): the request the server signs, decoded.
# {
#   "aud": "nats-authorization-request",
#   "iss": "NAFYFDR6WSIIQ5ABEJQWTZ6MGWSHSSATKRMR3STTBJ52MHJQA5YIHA3R",
#   "nats": {
#     ...
#     "user_nkey": "UA423HWLLH3GJC662GWLEBBGKTZXIM6TNZIXQKPCDPFIL3II5FNDRDLC",
#     "client_info": { ..., "user": "[REDACTED]", ... },
#     "connect_opts": { "auth_token": "test-cred-xyz", ... },
#     "type": "authorization_request"
#   }
# }
#
# Three things to read off it:
#  - The hand-off subject is real: the attempt arrived on
#    $SYS.REQ.USER.AUTH exactly as the flow describes.
#  - user_nkey is fresh for this connection. Run the publish again and
#    the next request carries a different one, so a captured reply can't
#    be replayed against a later connection.
#  - connect_opts.auth_token is the client's credential in plaintext.
#    client_info.user shows [REDACTED], but the raw token the client
#    presented rides along readable. A password or nkey seed would sit
#    here the same way.
#
# The token is readable to every subscriber on this subject. Isolating
# auth-svc in its own account keeps other users off the subject; xkey
# (Reference -> auth_callout) seals the payload so even a subscriber
# can't read it.
