#!/bin/bash

# Publish three messages. Each subject starts with events. so the EVENTS
# stream captures and stores every one. For each publish the CLI prints a
# "Stored in Stream" line with the assigned sequence, confirming it was stored.
nats pub events.page_loaded   '{"page":"/home"}'    --jetstream
nats pub events.input_changed '{"field":"email"}'   --jetstream
nats pub events.page_loaded   '{"page":"/pricing"}' --jetstream
