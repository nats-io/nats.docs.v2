#!/bin/bash

# Subscribe to all messages under the "greet" subject hierarchy
nats sub "greet.>"
