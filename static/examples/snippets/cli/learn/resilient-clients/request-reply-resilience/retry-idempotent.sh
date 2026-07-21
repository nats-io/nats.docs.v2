#!/bin/bash
# The safe retry pattern: branch on the failure, bound the retries, and
# key the request by order_id so a duplicate is a no-op on the responder.
#
# The CLI does not expose a per-failure backoff strategy the way the
# client libraries do (fast-retry-on-timeout vs
# exponential-backoff-on-no-responders). Here we show the same shape with
# a bounded loop and growing waits, and we keep the payload -- including
# its order_id -- byte-identical on every attempt so the inventory
# responder can de-dupe a re-sent request.

PAYLOAD='{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
MAX_ATTEMPTS=5

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  # The CLI exits 0 even when no reply arrives (it logs "No responders are
  # available" or silently gives up on timeout), so test for a reply body
  # instead of the exit code. Same order_id on every attempt -> the responder
  # treats a retry as the same question and returns the cached answer.
  reply=$(nats request orders.inventory.check "$PAYLOAD" --timeout 2s --raw 2>/dev/null)
  if [ -n "$reply" ]; then
    echo "inventory check answered on attempt $attempt: $reply"
    exit 0
  fi

  # Grow the wait, with a little jitter, so a fleet of requesters does not
  # retry in lockstep and overwhelm the responder the instant it returns.
  wait=$(( attempt * attempt ))
  jitter=$(( RANDOM % 2 ))
  echo "attempt $attempt failed; backing off ${wait}s before retry" >&2
  sleep "$(( wait + jitter ))"
  attempt=$(( attempt + 1 ))
done

echo "inventory check failed after $MAX_ATTEMPTS attempts; giving up" >&2
exit 1
