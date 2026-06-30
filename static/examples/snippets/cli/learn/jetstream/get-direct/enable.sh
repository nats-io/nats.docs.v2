#!/bin/bash

# Turn on Direct Get for a stream that doesn't have it. The CLI enables it
# for new streams, so ORDERS already shows "Direct Get: true" in stream info;
# run this only if a stream shows "Direct Get: false".
nats stream edit ORDERS --allow-direct
