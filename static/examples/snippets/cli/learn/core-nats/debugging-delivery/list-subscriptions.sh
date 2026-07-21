#!/bin/bash

# See where interest actually lives, over the plain-HTTP monitoring port.
# This needs the server started with a monitoring port: nats-server -m 8222

# /subsz lists the subscriptions the server holds right now. subs=1 adds the
# per-subscription detail (account, subject, cid) on top of the summary counts.
# acc=$G scopes the counts to your own account; without it num_subscriptions
# spans every account, including the system account. Even scoped, a few
# $SYS.REQ.* service subscriptions the server keeps in every account show up.
curl -s 'http://localhost:8222/subsz?subs=1&acc=$G' | jq

# The test parameter answers "who would receive a publish to THIS subject?"
# It returns only the subscriptions whose subject would match a message
# published to orders.us.created -- wildcard subscriptions (orders.>,
# orders.*.created) included. An empty subscriptions_list means nobody is
# subscribed, so a message published now would be dropped.
curl -s 'http://localhost:8222/subsz?subs=1&acc=$G&test=orders.us.created' | jq

# /connz shows the connections behind those subscriptions, so you can tell a
# missing subscription from a subscriber whose connection was cut. The
# Monitoring chapter documents its full parameter set.
curl -s 'http://localhost:8222/connz?subs=true' | jq
