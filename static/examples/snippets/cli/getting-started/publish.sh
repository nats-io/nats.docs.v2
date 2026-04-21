#!/bin/bash

# Publish a message to demo.nats.io
nats pub --server=demo.nats.io hello "Hello NATS!"
