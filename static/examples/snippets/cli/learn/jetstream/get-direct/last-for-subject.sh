#!/bin/bash

# Get the most recent message stored on a subject, when you know the subject
# but not the sequence. This is the read a key-value lookup is built on:
# "the latest value for a key" is "the last message on its subject".
nats stream get ORDERS --last-for orders.shipped
