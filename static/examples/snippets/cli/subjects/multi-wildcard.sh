# Subscribe using single token wildcard.
# Since each sub waits indefinitely, try each sub
# in a different terminal or just repeat the
# publishes for each sub.
nats sub "sensor.alarm.*"
nats sub "sensor.*.*.critical"
nats sub "sensor.>"

# Publish to specific subjects (use a different terminal)
nats pub sensor.alarm.smoke "kitchen,14:22"
nats pub sensor.alarm.smoke.critical "kitchen,14:23"
nats pub sensor.alarm.water "basement,16:42"
nats pub sensor.alarm.water.critical "basement,16:43"
