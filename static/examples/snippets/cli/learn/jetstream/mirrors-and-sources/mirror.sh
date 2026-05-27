#!/bin/bash
# Mirror the ORDERS stream into ORDERS-ARCHIVE.
# The --mirror flag makes this a read-only copy of ORDERS:
# same sequence numbers, same timestamps, same subjects.
nats stream add ORDERS-ARCHIVE --mirror ORDERS
