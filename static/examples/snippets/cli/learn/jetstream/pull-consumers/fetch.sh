#!/bin/bash
# A CLI fetch. --count retrieves up to 5 messages by issuing 5 single
# pulls in a row, not one batch request. Run this again to walk the
# stream a batch at a time.
nats consumer next ORDERS shipping --count 5
