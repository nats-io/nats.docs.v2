#!/bin/bash
# Show the messages your app published into the ORDERS stream. Each order
# event the app sent is now stored on the stream and can be read back.
nats stream view ORDERS
