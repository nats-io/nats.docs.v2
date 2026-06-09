#!/bin/bash
# Start Acme's development server n1 from a minimal config file.
# n1.conf sets server_name (n1), the client port (4222), and the
# monitoring port (8222) so /varz is reachable. Monitoring is off by
# default, so http_port is what makes the server observable.
nats-server -c n1.conf
