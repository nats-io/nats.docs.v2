# Monitor all messages in the system (subject to permissions)
nats sub ">"

# Monitor all orders
nats sub "orders.>"

# Monitor specific service communications
nats sub "myservice.>"
