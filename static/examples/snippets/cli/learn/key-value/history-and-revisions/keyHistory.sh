#!/bin/bash
# Read the kept history of a key. Each line is one revision: the value,
# its revision number, when it was written, and the operation. With a
# bucket created --history 1, only the current value shows; a deeper
# history keeps a trail behind the key, up to 64 revisions.
nats kv history INVENTORY widget-blue
