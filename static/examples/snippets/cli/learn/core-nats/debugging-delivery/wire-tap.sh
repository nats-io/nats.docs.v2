#!/bin/bash

# Wire tap: subscribe to the multi-token wildcard > and the server sends you
# a copy of every message published in your account, on its exact subject.
# This is the fastest way to answer "did my message go out at all, and on
# which subject?" -- the subject printed is the literal one the publisher
# used, so a stray token or a typo shows up the moment you publish.
#
# nats sub prints one line per message: [#N] Received on "<subject>", then the
# payload. Request-reply traffic shows the reply inbox too, as
# [#N] Received on "<subject>" with reply "_INBOX...".
nats sub ">"

# On a busy account, a > tap receives every message in it. Narrow the tap to
# the subject family you're investigating so you receive only what matters --
# here, everything under orders at any depth, and nothing else.
nats sub "orders.>"
