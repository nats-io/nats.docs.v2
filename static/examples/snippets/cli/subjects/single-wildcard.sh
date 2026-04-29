# Subscribe using single token wildcard.
# Since each sub waits indefinitely, try each sub
# in a different terminal or just repeat the
# publishes for each sub.
nats sub "orders.*.shipped"
nats sub "orders.*.placed"
nats sub "orders.retail.*"

# Publish to specific subjects (use a different terminal)
nats pub orders.wholesale.placed "Order W73737"
nats pub orders.retail.placed "Order R65432"
nats pub orders.wholesale.shipped "Order W73001"
nats pub orders.retail.shipped "Order R65321"
