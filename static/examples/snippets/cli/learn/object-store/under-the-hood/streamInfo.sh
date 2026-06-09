#!/bin/bash
# The INVOICES bucket is not a special kind of store — it is one JetStream
# stream named OBJ_INVOICES. Ask the server about that stream directly and
# you see the machinery the object API has been driving all along.
#
# `nats object` never showed you this name. The convention is OBJ_<bucket>,
# so the bucket you created as INVOICES is backed by the stream OBJ_INVOICES.
nats stream info OBJ_INVOICES

# Two things in the output explain how objects map onto messages.
#
# Subjects: the stream captures two subject spaces.
#   $O.INVOICES.C.>   the chunk messages — the bytes of every object
#   $O.INVOICES.M.>   the metadata messages — one ObjectInfo per object
#
# Configuration: AllowRollup is true and Discard is New. Rollup is what
# keeps only the latest metadata message per object name; you will see it
# carried as a header on each metadata publish below.

# Look at the raw chunk and metadata subjects for the small invoice you
# stored on page 1. The metadata subject base64url-encodes the object name
# so that any object name is a safe NATS subject.
nats stream subjects OBJ_INVOICES
