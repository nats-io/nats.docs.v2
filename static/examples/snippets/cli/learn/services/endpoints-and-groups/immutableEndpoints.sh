#!/bin/bash
# Endpoints are fixed once a service is running — inspect, then restart to change.
#
# There is no library call to remove, rename, or re-subject an endpoint:
# AddEndpoint only appends, and the subject, queue group, and metadata are
# set at creation. The CLI cannot detach an endpoint either; it can only
# read the shape your code registered. This snippet shows how to inspect
# the running layout and confirms there is no remove operation — the way
# every language tab treats endpoints as immutable.

# Read back the service to see the exact endpoints it registered: each name,
# its resolved subject, and its queue group. This is the layout your code
# fixed at AddEndpoint time; nothing here can be edited in place.
nats service info OrderInventory

# There is no "nats service remove-endpoint" — endpoints cannot be detached
# from a running service. To change the shape, stop the service in your code
# (svc.Stop()) and start a new one with the new endpoint names and subjects.
nats service list
