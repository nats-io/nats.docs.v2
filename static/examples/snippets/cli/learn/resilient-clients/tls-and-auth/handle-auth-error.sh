#!/bin/bash
# A secure connect fails in two distinct ways. Handle each one explicitly
# instead of treating every failure as the same network error.
#
# 1. CA validation fails: the server certificate does not chain to the CA
#    the client trusts (wrong --tlsca, expired or mismatched cert). The
#    handshake is rejected before any credential is sent.
# 2. Authorization fails: the link is secure but the creds are wrong,
#    expired, or revoked. The server replies -ERR after CONNECT.
#
# With the CLI a failed connect prints the reason and exits non-zero, so
# you can branch on it. The client libraries surface the same two cases as
# distinct errors (an auth error vs. a TLS error) on connect and on the
# disconnect/error callback during a reconnect. In
# nats.go the authorization side arrives as one of ErrAuthorization,
# ErrAuthExpired, ErrAuthRevoked, ErrPermissionViolation, or
# ErrMaxConnectionsExceeded. Other clients split these differently: nats.py
# raises AuthorizationError only for an authorization violation and reports
# expired, revoked, and connection-limit errors as a generic error carrying
# the server's message, and nats.rs reports an authorization-violation kind
# and passes the rest through as server error strings.

if nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://n1.acme.internal:4222 \
  --connection-name order-svc \
  --tlsca cluster-ca.pem \
  --creds order-svc.creds; then
  echo "connected securely and published"
else
  # Inspect the printed error to tell the cases apart: a TLS/CA failure
  # mentions the certificate; an authorization failure mentions the user.
  echo "secure connect failed: check the CA trust, then the credentials" >&2
  exit 1
fi
