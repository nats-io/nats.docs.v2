#!/bin/bash
# Create the INVOICES bucket. A bucket is a named object store: hand it a
# name and a description and the server provisions the JetStream stream
# that backs it. `order-svc` will put invoice PDFs here; `warehouse` will
# get them before shipping.
#
# The --description text is stored on the bucket and shows up in
# `nats object info INVOICES`.
nats object add INVOICES --description "Invoice PDFs"
